import type { AppCommand, AppSnapshot, CommandResult, ErrorCode } from '../../application/types';
export const speedLabel = (speed:number) => Number.isFinite(speed) ? `${speed.toFixed(1)} m/s` : '速度不可用';
const definitions = [
 ['MAGNET','磁铁','M6 3v10a6 6 0 0012 0V3h-4v10a2 2 0 01-4 0V3z'],
 ['DOUBLE_SCORE','双倍得分','M12 2l10 10-10 10L2 12z M8 9l8 6m0-6l-8 6'],
 ['SUPER_SNEAKERS','超级跑鞋','M3 5h5v7l4 3v4H2v-7z M14 3h5v7l3 3v4h-8z'],
 ['HOVERBOARD','悬浮滑板','M3 10h18l-2 5H5z M7 18h1m8 0h1'],
] as const;
export function powerUps(player:{hoverboardActive:boolean;activePowerUps:ReadonlyMap<string,number>}) {
 return definitions.flatMap(([id,label,path])=>{const seconds=player.activePowerUps.get(id);const active=id==='HOVERBOARD'&&player.hoverboardActive;
 if(id==='HOVERBOARD'&&!active)return [];
 if(!(Number.isFinite(seconds)&&seconds!>0)&&!active)return [];
 return [{id,label,path,time:seconds!>0&&Number.isFinite(seconds)?`${Math.ceil(seconds!)}秒`:'保护中'}];});
}
export const errorLabel=(code?:ErrorCode|null):string=>(({ SAVE_FAILED:'保存未完成，请重试原操作',STORAGE_UNAVAILABLE:'存储不可用，请重试原操作',LOCK_UNAVAILABLE:'存储繁忙，请重试原操作',CONFLICT:'数据已变化，请确认后重试',STALE_RUN:'本局状态已变化，请重新选择操作',INVALID_STATE:'当前状态无法执行此操作',INSUFFICIENT_FUNDS:'余额不足',NOT_OWNED:'尚未拥有此外观',UNKNOWN_SKIN:'外观不可用',FUTURE_SCHEMA:'存档版本不兼容',CORRUPT_SAVE:'存档数据异常',INVALID_AUDIO:'音频设置未保存，请重试'} as Partial<Record<string,string>>)[code??'']??'操作未完成，请重试');
export interface PendingReceipt {readonly commandId:string;readonly type:AppCommand['type'];readonly runId:string|null}
export class Receipts {
 pending=new Map<string,PendingReceipt & {at:number}>(); error='';
 begin(p:PendingReceipt,at:number){if(!this.pending.has(p.commandId))this.pending.set(p.commandId,{...p,at});}
 end(result:Readonly<CommandResult>,runId:string|null){const p=this.pending.get(result.commandId);if(!p)return false;this.pending.delete(result.commandId);if(p.runId!==null&&p.runId!==runId)return true;this.error=result.ok?'':errorLabel(result.errorCode);return true;}
 message(now:number){const oldest=Math.min(...[...this.pending.values()].map(p=>p.at));return now-oldest>=5000?'仍在处理，请稍候':now-oldest>=300?'正在处理…':'';}
}
export class ToastQueue {
 items:{text:string;at:number;remaining:number}[]=[];private last:number|null=null;
 add(text:string,now:number){if(!text.trim())return;if(this.items.some(x=>x.text===text&&now-x.at<2000))return;if(this.items.length===4)this.items.splice(1,1);this.items.push({text,at:now,remaining:3000});}
 advance(now:number,hidden:boolean){if(this.last!==null&&!hidden&&this.items[0]){this.items[0].remaining-=now-this.last;if(this.items[0].remaining<=0)this.items.shift();}this.last=now;}
 clear(){this.items=[];this.last=null;}
}

/** A menu visit is a UI scope, not the permanent null run identity. */
export class InteractionScope {
 private identity:string|null=null;
 generation=0;
 enter(app:Pick<AppSnapshot,'appState'|'activeRunId'>):boolean {
  const page=app.appState==='MENU'||app.appState==='SHOP'?app.appState:'RUN';
  const identity=JSON.stringify([page,app.activeRunId]);
  if(identity===this.identity)return false;
  this.identity=identity;this.generation++;return true;
 }
}
