import type { AppCommand, AppSnapshot, AudioOperation, CommandResult, ErrorCode, RunSummary } from './types';
import { frozenCopy } from './types';
import { SaveRepository, validAudio, validInteger } from './saveRepository';
import { SKINS } from './skinCatalog';

function validAudioOperation(value:unknown):value is AudioOperation {
  if(!value||typeof value!=='object')return false;
  const operation=value as AudioOperation;
  if(operation.kind==='TOGGLE')return ['masterMuted','bgmEnabled','sfxEnabled'].includes(operation.field);
  return operation.kind==='SET_VOLUME'&&['bgmVolume','sfxVolume'].includes(operation.field)&&typeof operation.value==='number'&&Number.isFinite(operation.value)&&operation.value>=0&&operation.value<=1;
}

/** Application commands are serialized independently of fixed simulation ticks. */
export class AppService {
  private repository:SaveRepository; private createRunId:()=>string;
  private appState:AppSnapshot['appState']='MENU'; private activeRunId:string|null=null;
  private summary:Readonly<RunSummary>|null=null; private status:AppSnapshot['settlementStatus']='NONE';
  private errorCode:ErrorCode|null=null; private ready=false;
  private queue:Promise<unknown>=Promise.resolve();
  private pendingTransactions=0;
  private commands=new Map<string,{fingerprint:string;result:CommandResult}>();
  private usedRunIds=new Set<string>();
  constructor(repository:SaveRepository,createRunId:()=>string=()=>`run-${crypto.randomUUID()}`){this.repository=repository;this.createRunId=createRunId;}
  get snapshot():AppSnapshot {
    const d=this.repository.snapshot;
    return frozenCopy({appState:this.appState,activeRunId:this.activeRunId,walletCoins:d.walletCoins,highScore:d.highScore,revision:d.revision,ownedSkinIds:d.ownedSkinIds,selectedSkinId:d.selectedSkinId,audio:d.audio,summary:this.summary,settlementStatus:this.status,errorCode:this.errorCode});
  }
  private enqueue<T>(operation:()=>Promise<T>):Promise<T>{const next=this.queue.then(operation,operation);this.queue=next.catch(()=>{});return next;}
  private transaction<T>(operation:()=>Promise<T>):Promise<T>{this.pendingTransactions++;return this.enqueue(operation).finally(()=>{this.pendingTransactions--;});}
  async initialize():Promise<CommandResult>{return this.enqueue(async()=>{const r=await this.repository.load();this.ready=r.ok;this.errorCode=r.errorCode??null;return {commandId:'initialize',...r};});}
  dispatch(command:AppCommand):Promise<CommandResult>{
    command=frozenCopy(command);
    // Start/pause/resume do not touch storage. Preserve the established same-stack
    // input isolation boundary, while never overtaking a pending transaction.
    if(command&&command.commandId&&this.pendingTransactions===0&&['START_RUN','PAUSE_RUN','RESUME_RUN'].includes(command.type)){
      const fingerprint=JSON.stringify(command),previous=this.commands.get(command.commandId);
      if(previous)return Promise.resolve(previous.fingerprint===fingerprint?frozenCopy(previous.result):this.failure(command.commandId,'INVALID_COMMAND'));
      const result=this.lifecycle(command);
      if(result.ok)this.commands.set(command.commandId,{fingerprint,result:frozenCopy(result)});
      return Promise.resolve(frozenCopy(result));
    }
    return this.transaction(async()=>{
    if(!command||!command.commandId)return this.failure('', 'INVALID_COMMAND');
    const fingerprint=JSON.stringify(command),previous=this.commands.get(command.commandId);
    if(previous)return previous.fingerprint===fingerprint?frozenCopy(previous.result):this.failure(command.commandId,'INVALID_COMMAND');
    const result=await this.execute(command);
    // Persisted transactions are also protected by ownership/run ledgers. Failed
    // requests are deliberately retryable with the same command identity.
    if(result.ok)this.commands.set(command.commandId,{fingerprint,result:frozenCopy(result)});
    return frozenCopy(result);
  });}
  finish(summary:RunSummary):Promise<CommandResult>{const sealed=frozenCopy(summary);return this.transaction(()=>this.settle(sealed,`finish:${sealed?.runId??''}`));}
  private failure(commandId:string,errorCode:ErrorCode):CommandResult{this.errorCode=errorCode;return {ok:false,commandId,errorCode};}
  private async ensureReady():Promise<ErrorCode|null>{
    if(this.ready)return null;
    const result=await this.repository.load();this.ready=result.ok;this.errorCode=result.errorCode??null;
    return this.errorCode;
  }
  private saveFailure(commandId:string,errorCode:ErrorCode):CommandResult {
    // A stale owner must reload under the shared lock before a subsequent retry.
    // Keep the sealed run in memory; refreshing the page would lose that summary.
    if(errorCode==='CONFLICT'||errorCode==='STORAGE_UNAVAILABLE')this.ready=false;
    return this.failure(commandId,errorCode);
  }
  private success(commandId:string,idempotent=false):CommandResult{this.errorCode=null;return {ok:true,commandId,...(this.activeRunId?{runId:this.activeRunId}:{}),...(idempotent?{idempotent:true}:{})};}
  private validSummary(s:RunSummary):boolean {
    return !!s&&typeof s.runId==='string'&&s.runId.length>0&&[s.scoreInt,s.pickupCount,s.pickupCoins,s.rewardCoins,s.earnedCoins].every(validInteger)&&Number.isSafeInteger(s.pickupCoins+s.rewardCoins)&&s.earnedCoins===s.pickupCoins+s.rewardCoins&&(s.endReason==='COLLISION'||s.endReason==='QUIT');
  }
  private async settle(candidate:RunSummary,commandId:string):Promise<CommandResult>{
    if(!candidate||candidate.runId!==this.activeRunId)return this.failure(commandId,'STALE_RUN');
    if(!this.validSummary(candidate))return this.failure(commandId,'INVALID_SUMMARY');
    if(!['PLAYING','PAUSED','GAMEOVER'].includes(this.appState))return this.failure(commandId,'INVALID_STATE');
    if(this.summary&&JSON.stringify(candidate)!==JSON.stringify(this.summary))return this.failure(commandId,'INVALID_SUMMARY');
    if(!this.summary)this.summary=frozenCopy(candidate);
    this.appState='GAMEOVER';
    this.status='PENDING';
    const readyError=await this.ensureReady();if(readyError){this.status='FAILED';return this.failure(commandId,readyError);}
    if(this.repository.snapshot.settledRunIds.includes(candidate.runId)){this.status='COMMITTED';return this.success(commandId,true);}
    const summary=this.summary;
    if(!validInteger(this.repository.snapshot.walletCoins+summary.earnedCoins)){this.status='FAILED';return this.failure(commandId,'OVERFLOW');}
    const result=await this.repository.update(d=>{
      d.walletCoins+=summary.earnedCoins;d.highScore=Math.max(d.highScore,summary.scoreInt);d.settledRunIds.push(summary.runId);
    });
    if(!result.ok){this.status='FAILED';return this.saveFailure(commandId,result.errorCode!);}
    this.status='COMMITTED';return this.success(commandId);
  }
  private start(commandId:string):CommandResult {
    const runId=this.createRunId();
    if(!runId||this.usedRunIds.has(runId)||this.repository.snapshot.settledRunIds.includes(runId))return this.failure(commandId,'INVALID_COMMAND');
    this.usedRunIds.add(runId);this.activeRunId=runId;this.appState='PLAYING';this.summary=null;this.status='NONE';return this.success(commandId);
  }
  private lifecycle(c:AppCommand):CommandResult {
    if(c.type==='START_RUN'){
      if(this.appState!=='MENU'||this.activeRunId!==null)return this.failure(c.commandId,'INVALID_STATE');
      return this.start(c.commandId);
    }
    if(!this.activeRunId||c.runId!==this.activeRunId)return this.failure(c.commandId,'STALE_RUN');
    if(this.appState!==(c.type==='PAUSE_RUN'?'PLAYING':'PAUSED'))return this.failure(c.commandId,'INVALID_STATE');
    this.appState=c.type==='PAUSE_RUN'?'PAUSED':'PLAYING';return this.success(c.commandId);
  }
  private async execute(c:AppCommand):Promise<CommandResult>{
    switch(c.type){
      case 'START_RUN':
      case 'PAUSE_RUN': case 'RESUME_RUN':return this.lifecycle(c);
      case 'RESTART_RUN': case 'GO_MENU': case 'OPEN_SHOP':{
        if(this.activeRunId!==null){
          if(c.runId!==this.activeRunId)return this.failure(c.commandId,'STALE_RUN');
          if(c.type==='RESTART_RUN'&&!['PAUSED','GAMEOVER'].includes(this.appState))return this.failure(c.commandId,'INVALID_STATE');
          if(c.type==='OPEN_SHOP'&&this.appState!=='GAMEOVER')return this.failure(c.commandId,'INVALID_STATE');
          const summary=this.summary??c.summary;
          if(!summary)return this.failure(c.commandId,'INVALID_SUMMARY');
          const result=await this.settle(summary,c.commandId);if(!result.ok)return result;
          if(c.type==='RESTART_RUN')return this.start(c.commandId);
          this.activeRunId=null;
        }else{
          if(c.runId!=null)return this.failure(c.commandId,'STALE_RUN');
          if(c.type==='RESTART_RUN')return this.failure(c.commandId,'INVALID_STATE');
          if(c.type==='OPEN_SHOP'&&this.appState!=='MENU')return this.failure(c.commandId,'INVALID_STATE');
          if(c.type==='GO_MENU'&&!['MENU','SHOP'].includes(this.appState))return this.failure(c.commandId,'INVALID_STATE');
        }
        this.appState=c.type==='OPEN_SHOP'?'SHOP':'MENU';return this.success(c.commandId);
      }
      case 'BUY_SKIN': case 'EQUIP_SKIN':{
        if(this.appState!=='SHOP')return this.failure(c.commandId,'INVALID_STATE');
        const skin=SKINS.find(s=>s.id===c.skinId);if(!skin)return this.failure(c.commandId,'UNKNOWN_SKIN');
        const readyError=await this.ensureReady();if(readyError)return this.failure(c.commandId,readyError);
        const freshness=await this.repository.checkFreshness();
        if(!freshness.ok)return this.saveFailure(c.commandId,freshness.errorCode!);
        const save=this.repository.snapshot,owned=save.ownedSkinIds.includes(skin.id);
        if(c.type==='BUY_SKIN'&&owned)return this.success(c.commandId,true);
        if(c.type==='EQUIP_SKIN'&&!owned)return this.failure(c.commandId,'NOT_OWNED');
        if(!owned&&save.walletCoins<skin.price)return this.failure(c.commandId,'INSUFFICIENT_FUNDS');
        const result=await this.repository.update(d=>{if(!owned){d.walletCoins-=skin.price;d.ownedSkinIds.push(skin.id);}d.selectedSkinId=skin.id;});
        return result.ok?this.success(c.commandId):this.saveFailure(c.commandId,result.errorCode!);
      }
      case 'SET_AUDIO':{
        if(!validAudio(c.audio))return this.failure(c.commandId,'INVALID_AUDIO');
        const readyError=await this.ensureReady();if(readyError)return this.failure(c.commandId,readyError);
        const audio=structuredClone(c.audio),result=await this.repository.update(d=>{d.audio=audio;});
        return result.ok?this.success(c.commandId):this.saveFailure(c.commandId,result.errorCode!);
      }
      case 'UPDATE_AUDIO':{
        if(!validAudioOperation(c.audioOperation))return this.failure(c.commandId,'INVALID_AUDIO');
        const readyError=await this.ensureReady();if(readyError)return this.failure(c.commandId,readyError);
        const operation=c.audioOperation;
        const result=await this.repository.update(d=>{
          // Interpret the intent only after the preceding command committed and
          // while holding the repository lock; never replay an old full snapshot.
          if(operation.kind==='TOGGLE')d.audio[operation.field]=!d.audio[operation.field];
          else d.audio[operation.field]=operation.value;
        });
        return result.ok?this.success(c.commandId):this.saveFailure(c.commandId,result.errorCode!);
      }
      default:return this.failure(c.commandId,'INVALID_COMMAND');
    }
  }
}
