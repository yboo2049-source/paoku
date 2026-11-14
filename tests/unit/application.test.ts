import { describe, expect, it } from 'vitest';
import { AppService } from '../../src/application/appService';
import { SaveRepository } from '../../src/application/saveRepository';
import type { AppCommand, RunSummary } from '../../src/application/types';
class Storage { data=new Map<string,string>();fail=false;getItem(k:string){return this.data.get(k)??null;}setItem(k:string,v:string){if(this.fail)throw Error('quota');this.data.set(k,v);} }
const lock=async<T>(f:()=>Promise<T>)=>f();
const summary=(runId:string,endReason:'QUIT'|'COLLISION'='COLLISION'):RunSummary=>({runId,scoreInt:123,pickupCount:30,pickupCoins:30,rewardCoins:50,earnedCoins:80,endReason});
async function setup(){const storage=new Storage();let n=0;const app=new AppService(new SaveRepository(storage,lock),()=>`run-${++n}`);await app.initialize();await app.dispatch({commandId:'start',type:'START_RUN'});return {app,storage};}
describe('PAO-14 application lifecycle and settlement',()=>{
  class UnknownStorage extends Storage {
    mode:'none'|'after'|'before'='none'; unreadable=false; confirmationReads=0; writes=0;
    override getItem(key:string){if(this.unreadable||this.confirmationReads>0){if(this.confirmationReads>0)this.confirmationReads--;throw Error('read denied');}return super.getItem(key);}
    override setItem(key:string,value:string){
      this.writes++;const mode=this.mode;this.mode='none';
      if(mode==='before'){this.confirmationReads=1;throw Error('write denied');}
      super.setItem(key,value);
      if(mode==='after'){this.confirmationReads=1;throw Error('ack lost');}
    }
  }
  async function unknownSetup(){const storage=new UnknownStorage(),repository=new SaveRepository(storage,lock),app=new AppService(repository);await app.initialize();storage.writes=0;return {storage,repository,app};}
  const unknownToggle={commandId:'unknown-toggle',type:'UPDATE_AUDIO',audioOperation:{kind:'TOGGLE',field:'masterMuted'}} as AppCommand;
  it('confirms the exact written candidate after unreadable acknowledgment without toggling twice',async()=>{
    const {app,storage}=await unknownSetup();storage.mode='after';expect((await app.dispatch(unknownToggle)).errorCode).toBe('SAVE_FAILED');expect(app.snapshot.audio.masterMuted).toBe(false);expect(JSON.parse([...storage.data.values()][0]).audio.masterMuted).toBe(true);
    expect((await app.dispatch(unknownToggle)).ok).toBe(true);expect(app.snapshot.audio.masterMuted).toBe(true);expect(app.snapshot.revision).toBe(1);expect(storage.writes).toBe(1);
  });
  it('keeps an unknown candidate unpublished while all confirmation reads keep failing',async()=>{
    const {app,storage}=await unknownSetup();storage.mode='after';await app.dispatch(unknownToggle);storage.unreadable=true;
    for(let i=0;i<3;i++){expect((await app.dispatch(unknownToggle)).ok).toBe(false);expect(app.snapshot.audio.masterMuted).toBe(false);expect(app.snapshot.revision).toBe(0);}
    storage.unreadable=false;expect((await app.dispatch(unknownToggle)).ok).toBe(true);expect(app.snapshot.audio.masterMuted).toBe(true);expect(app.snapshot.revision).toBe(1);expect(storage.writes).toBe(1);
  });
  it('does not let another queued command claim the unknown receipt or late retry overwrite it',async()=>{
    const {app,storage}=await unknownSetup();storage.mode='after';const first=app.dispatch(unknownToggle);const next=app.dispatch({commandId:'second-toggle',type:'UPDATE_AUDIO',audioOperation:{kind:'TOGGLE',field:'sfxEnabled'}});
    expect((await first).ok).toBe(false);expect((await next).ok).toBe(true);expect(app.snapshot.audio).toMatchObject({masterMuted:true,sfxEnabled:false});expect(app.snapshot.revision).toBe(2);
    expect((await app.dispatch(unknownToggle)).ok).toBe(true);expect(app.snapshot.audio).toMatchObject({masterMuted:true,sfxEnabled:false});expect(app.snapshot.revision).toBe(2);expect(storage.writes).toBe(2);
  });
  it('retains unknown transaction identity through load and freshness checks',async()=>{
    const {app,repository,storage}=await unknownSetup();storage.mode='after';await app.dispatch(unknownToggle);expect((await repository.load()).ok).toBe(true);expect((await repository.checkFreshness()).ok).toBe(true);expect((await app.dispatch(unknownToggle)).ok).toBe(true);expect(app.snapshot.audio.masterMuted).toBe(true);expect(app.snapshot.revision).toBe(1);expect(storage.writes).toBe(1);
  });
  it('does not let another operation reuse the commandId of an unconfirmed candidate',async()=>{
    const {app,storage}=await unknownSetup();storage.mode='after';await app.dispatch(unknownToggle);
    expect((await app.dispatch({...unknownToggle,audioOperation:{kind:'TOGGLE',field:'sfxEnabled'}})).errorCode).toBe('INVALID_COMMAND');expect(app.snapshot.audio).toMatchObject({masterMuted:false,sfxEnabled:true});
    expect((await app.dispatch(unknownToggle)).ok).toBe(true);expect(app.snapshot.audio).toMatchObject({masterMuted:true,sfxEnabled:true});expect(app.snapshot.revision).toBe(1);expect(storage.writes).toBe(1);
  });
  it('retains the original receipt when freshness alone confirms before a later operation',async()=>{
    const {app,repository,storage}=await unknownSetup();storage.mode='after';await app.dispatch(unknownToggle);expect((await repository.checkFreshness()).ok).toBe(true);
    await app.dispatch({commandId:'volume-after-confirm',type:'UPDATE_AUDIO',audioOperation:{kind:'SET_VOLUME',field:'bgmVolume',value:0.25}});
    expect((await app.dispatch({...unknownToggle,audioOperation:{kind:'TOGGLE',field:'bgmEnabled'}})).errorCode).toBe('INVALID_COMMAND');expect((await app.dispatch(unknownToggle)).ok).toBe(true);expect(app.snapshot.audio).toMatchObject({masterMuted:true,bgmVolume:0.25,bgmEnabled:true});expect(app.snapshot.revision).toBe(2);expect(storage.writes).toBe(2);
  });
  it('protects an unresolved candidate against an unrelated third token',async()=>{
    const {app,storage}=await unknownSetup();storage.mode='after';await app.dispatch(unknownToggle);const key=[...storage.data.keys()][0],other=JSON.parse(storage.data.get(key)!);other.revision=2;other.audio.sfxEnabled=false;storage.data.set(key,JSON.stringify(other));
    expect((await app.dispatch(unknownToggle)).errorCode).toBe('CONFLICT');expect((await app.initialize()).errorCode).toBe('CONFLICT');expect((await app.dispatch(unknownToggle)).errorCode).toBe('CONFLICT');expect(storage.writes).toBe(1);expect(app.snapshot.revision).toBe(0);
  });
  const audioCommand=(commandId:string,audioOperation:unknown)=>({commandId,type:'UPDATE_AUDIO',audioOperation}) as AppCommand;
  async function audioSetup(){
    const storage=new Storage();let tail:Promise<unknown>=Promise.resolve();const serial=<T>(f:()=>Promise<T>):Promise<T>=>{const next=tail.then(f);tail=next.catch(()=>{});return next;};const app=new AppService(new SaveRepository(storage,serial));await app.initialize();
    const hold=async()=>{let release!:()=>void,entered!:()=>void;const waiting=new Promise<void>(resolve=>{release=resolve;});const started=new Promise<void>(resolve=>{entered=resolve;});const done=serial(async()=>{entered();await waiting;});await started;return {release,done};};return {app,storage,hold};
  }
  it.each([
    ['distinct toggles',[{kind:'TOGGLE',field:'bgmEnabled'},{kind:'TOGGLE',field:'sfxEnabled'}],{bgmEnabled:false,sfxEnabled:false}],
    ['same toggle twice',[{kind:'TOGGLE',field:'bgmEnabled'},{kind:'TOGGLE',field:'bgmEnabled'}],{bgmEnabled:true}],
    ['master toggle twice',[{kind:'TOGGLE',field:'masterMuted'},{kind:'TOGGLE',field:'masterMuted'}],{masterMuted:false}],
    ['volume and toggles interleaved',[{kind:'SET_VOLUME',field:'bgmVolume',value:0.2},{kind:'TOGGLE',field:'sfxEnabled'},{kind:'SET_VOLUME',field:'sfxVolume',value:0.4},{kind:'SET_VOLUME',field:'bgmVolume',value:0.7}],{bgmVolume:0.7,sfxVolume:0.4,sfxEnabled:false}],
  ])('applies queued audio intents against committed settings: %s',async(_name,operations,expected)=>{
    const {app,hold}=await audioSetup(),blocked=await hold(),before=app.snapshot;
    const results=(operations as unknown[]).map((operation,i)=>app.dispatch(audioCommand('op-'+i,operation)));
    await Promise.resolve();expect(app.snapshot.audio).toEqual(before.audio);expect(app.snapshot.revision).toBe(before.revision);
    blocked.release();await blocked.done;expect((await Promise.all(results)).every(r=>r.ok)).toBe(true);expect(app.snapshot.audio).toMatchObject(expected);expect(app.snapshot.revision).toBe(before.revision+operations.length);
  });
  it('retries a failed audio operation without a fake publication and deduplicates its commandId',async()=>{
    const {app,storage,hold}=await audioSetup();const command=audioCommand('toggle',{kind:'TOGGLE',field:'sfxEnabled'});storage.fail=true;expect((await app.dispatch(command)).errorCode).toBe('SAVE_FAILED');expect(app.snapshot.audio.sfxEnabled).toBe(true);expect(app.snapshot.revision).toBe(0);storage.fail=false;const blocked=await hold();const first=app.dispatch(command),second=app.dispatch(command);expect(app.snapshot.audio.sfxEnabled).toBe(true);blocked.release();await blocked.done;expect((await first).ok).toBe(true);expect(await second).toEqual(await first);expect(app.snapshot.audio.sfxEnabled).toBe(false);expect(app.snapshot.revision).toBe(1);
  });
  it.each([null,{kind:'TOGGLE',field:'bgmVolume'},{kind:'TOGGLE',field:'unknown'},{kind:'SET_VOLUME',field:'bgmEnabled',value:0.5},{kind:'SET_VOLUME',field:'bgmVolume',value:NaN},{kind:'SET_VOLUME',field:'sfxVolume',value:Infinity},{kind:'SET_VOLUME',field:'sfxVolume',value:-0.1},{kind:'SET_VOLUME',field:'sfxVolume',value:1.1}])('rejects invalid audio operation without storing: %j',async operation=>{
    const {app}=await audioSetup();expect((await app.dispatch(audioCommand('bad',operation))).errorCode).toBe('INVALID_AUDIO');expect(app.snapshot.revision).toBe(0);
  });
  it('retries interrupted initialization within the same live run',async()=>{const storage=new Storage();storage.data.set('paoku_total_coins','25');storage.fail=true;const app=new AppService(new SaveRepository(storage,lock),()=> 'migrated-run');expect((await app.initialize()).ok).toBe(false);await app.dispatch({commandId:'s',type:'START_RUN'});storage.fail=false;expect((await app.finish(summary('migrated-run'))).ok).toBe(true);expect(app.snapshot.walletCoins).toBe(105);});
  it('reloads a conflicting repository on retry while preserving the sealed summary',async()=>{const {app,storage}=await setup();const other=new SaveRepository(storage,lock);await other.load();await other.update(d=>{d.walletCoins=15;});expect((await app.finish(summary('run-1'))).errorCode).toBe('CONFLICT');expect(app.snapshot.walletCoins).toBe(0);expect((await app.finish(summary('run-1'))).ok).toBe(true);expect(app.snapshot.walletCoins).toBe(95);});
  it('publishes in-memory start/pause/resume synchronously without storage access',()=>{const storage=new Storage();const app=new AppService(new SaveRepository(storage,lock),()=> 'sync');app.dispatch({commandId:'s',type:'START_RUN'});expect(app.snapshot.appState).toBe('PLAYING');app.dispatch({commandId:'p',type:'PAUSE_RUN',runId:'sync'});expect(app.snapshot.appState).toBe('PAUSED');app.dispatch({commandId:'r',type:'RESUME_RUN',runId:'sync'});expect(app.snapshot.appState).toBe('PLAYING');});
  it('never substitutes a changed summary when retrying a sealed run',async()=>{const {app,storage}=await setup();storage.fail=true;await app.finish(summary('run-1'));storage.fail=false;expect((await app.finish({...summary('run-1'),pickupCoins:100,earnedCoins:150})).errorCode).toBe('INVALID_SUMMARY');expect(app.snapshot.summary?.earnedCoins).toBe(80);await app.finish(summary('run-1'));expect(app.snapshot.walletCoins).toBe(80);});
  it('rejects reuse of a successful commandId with a different payload',async()=>{const {app}=await setup();await app.dispatch({commandId:'p',type:'PAUSE_RUN',runId:'run-1'});expect((await app.dispatch({commandId:'p',type:'RESUME_RUN',runId:'run-1'})).errorCode).toBe('INVALID_COMMAND');expect(app.snapshot.appState).toBe('PAUSED');});
  it('owns state and only permits matching run transitions',async()=>{const {app}=await setup();expect(app.snapshot).toMatchObject({appState:'PLAYING',activeRunId:'run-1'});expect((await app.dispatch({commandId:'stale',type:'PAUSE_RUN',runId:'old'})).errorCode).toBe('STALE_RUN');await app.dispatch({commandId:'pause',type:'PAUSE_RUN',runId:'run-1'});expect(app.snapshot.appState).toBe('PAUSED');await app.dispatch({commandId:'resume',type:'RESUME_RUN',runId:'run-1'});expect(app.snapshot.appState).toBe('PLAYING');expect(Object.isFrozen(app.snapshot)).toBe(true);expect(Object.isFrozen(app.snapshot.ownedSkinIds)).toBe(true);});
  it('settles duplicate finish and return exactly once',async()=>{const {app}=await setup();await app.finish(summary('run-1'));await app.finish(summary('run-1'));expect(app.snapshot.walletCoins).toBe(80);await app.dispatch({commandId:'menu',type:'GO_MENU',runId:'run-1'});expect(app.snapshot).toMatchObject({appState:'MENU',activeRunId:null,walletCoins:80,highScore:123});await app.dispatch({commandId:'menu2',type:'GO_MENU',runId:null});expect(app.snapshot.walletCoins).toBe(80);});
  it('seals paused restart before creating a new run and rejects late old commands',async()=>{const {app}=await setup();await app.dispatch({commandId:'p',type:'PAUSE_RUN',runId:'run-1'});await app.dispatch({commandId:'r',type:'RESTART_RUN',runId:'run-1',summary:summary('run-1','QUIT')});expect(app.snapshot).toMatchObject({appState:'PLAYING',activeRunId:'run-2',walletCoins:80});expect((await app.finish(summary('run-1'))).errorCode).toBe('STALE_RUN');expect((await app.dispatch({commandId:'late',type:'GO_MENU',runId:'run-1'})).errorCode).toBe('STALE_RUN');expect(app.snapshot.activeRunId).toBe('run-2');});
  it('preserves summary and retry ability after save failure without partial success',async()=>{const {app,storage}=await setup();storage.fail=true;expect((await app.finish(summary('run-1'))).ok).toBe(false);expect(app.snapshot).toMatchObject({walletCoins:0,highScore:0,settlementStatus:'FAILED'});expect(app.snapshot.summary?.earnedCoins).toBe(80);expect(Object.isFrozen(app.snapshot.summary)).toBe(true);expect((await app.dispatch({commandId:'r',type:'RESTART_RUN',runId:'run-1'})).ok).toBe(false);expect(app.snapshot.activeRunId).toBe('run-1');storage.fail=false;expect((await app.finish(summary('run-1'))).ok).toBe(true);expect(app.snapshot.walletCoins).toBe(80);});
  it('survives concurrent duplicate finish and menu/shop transitions',async()=>{const {app}=await setup();await Promise.all([app.finish(summary('run-1')),app.finish(summary('run-1'))]);await app.dispatch({commandId:'shop',type:'OPEN_SHOP',runId:'run-1'});expect(app.snapshot).toMatchObject({appState:'SHOP',activeRunId:null,walletCoins:80});});
  it('does not accept forged invalid summary arithmetic',async()=>{const {app}=await setup();expect((await app.finish({...summary('run-1'),earnedCoins:800})).errorCode).toBe('INVALID_SUMMARY');expect(app.snapshot.walletCoins).toBe(0);});
  it('retry after refresh cannot replay a settled run or compact away old IDs',async()=>{const {app,storage}=await setup();await app.finish(summary('run-1'));const r=new SaveRepository(storage,lock);await r.load();expect(r.snapshot.settledRunIds).toContain('run-1');expect(r.snapshot.walletCoins).toBe(80);});
});
