import type { AudioSettings, SaveData, ErrorCode, RepositoryResult } from './types';
import { frozenCopy } from './types';
export const SAVE_KEY = 'paoku_save_v1';
export interface SaveStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export type SaveLock = <T>(work: () => Promise<T>) => Promise<T>;
export const DEFAULT_AUDIO: AudioSettings = { masterMuted:false,bgmEnabled:true,sfxEnabled:true,bgmVolume:0.6,sfxVolume:0.9 };
const SKIN_IDS = ['cyan','pink','gold','green','purple'];
const defaults = ():SaveData => ({schemaVersion:1,revision:0,walletCoins:0,highScore:0,ownedSkinIds:['cyan'],selectedSkinId:'cyan',audio:{...DEFAULT_AUDIO},settledRunIds:[]});
export const validInteger = (v:unknown):v is number => typeof v==='number' && Number.isSafeInteger(v) && v>=0;
export function validAudio(v:unknown):v is AudioSettings {
  if(!v || typeof v!=='object') return false; const a=v as AudioSettings;
  return typeof a.masterMuted==='boolean'&&typeof a.bgmEnabled==='boolean'&&typeof a.sfxEnabled==='boolean'&&[a.bgmVolume,a.sfxVolume].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1);
}
function validSave(v:unknown):v is SaveData {
  if(!v || typeof v!=='object')return false; const d=v as SaveData;
  return d.schemaVersion===1&&validInteger(d.revision)&&validInteger(d.walletCoins)&&validInteger(d.highScore)&&validAudio(d.audio)&&Array.isArray(d.ownedSkinIds)&&d.ownedSkinIds.includes('cyan')&&d.ownedSkinIds.every(s=>SKIN_IDS.includes(s))&&new Set(d.ownedSkinIds).size===d.ownedSkinIds.length&&d.ownedSkinIds.includes(d.selectedSkinId)&&Array.isArray(d.settledRunIds)&&d.settledRunIds.every(s=>typeof s==='string'&&s.length>0)&&new Set(d.settledRunIds).size===d.settledRunIds.length;
}
const browserLock:SaveLock=async work=>{
  if(typeof navigator==='undefined'||!navigator.locks)throw new Error('LOCK_UNAVAILABLE');
  return navigator.locks.request('paoku-save-transaction-v1',()=>work());
};
/** Web Locks serialize cooperating tabs; raw-token comparison rejects stale owners.
 * Legacy/non-cooperating code editing this key is outside that lock protocol. */
export class SaveRepository {
  private data:SaveData=defaults(); private token:string|null=null; private loaded=false; private blocked:ErrorCode|null=null;
  private storage:SaveStorage; private lock:SaveLock;
  constructor(storage:SaveStorage,lock:SaveLock=browserLock){this.storage=storage;this.lock=lock;}
  get snapshot():Readonly<SaveData>{return frozenCopy(this.data);}
  async load():Promise<RepositoryResult>{
    try{return await this.lock(async()=>{
      let raw:string|null; try{raw=this.storage.getItem(SAVE_KEY);}catch{return this.block('STORAGE_UNAVAILABLE');}
      if(raw!==null){
        let parsed:unknown;try{parsed=JSON.parse(raw);}catch{return this.block('CORRUPT_SAVE');}
        if(parsed&&typeof parsed==='object'&&typeof (parsed as SaveData).schemaVersion==='number'&&(parsed as SaveData).schemaVersion>1)return this.block('FUTURE_SCHEMA');
        if(!validSave(parsed))return this.block('CORRUPT_SAVE');
        this.data=parsed;this.token=raw;this.loaded=true;this.blocked=null;return {ok:true};
      }
      let migrated:SaveData;try{migrated=this.migrate();}catch{return this.block('STORAGE_UNAVAILABLE');}
      const encoded=JSON.stringify(migrated);const result=this.write(encoded);if(!result.ok)return this.block(result.errorCode!);
      this.data=migrated;this.token=encoded;this.loaded=true;this.blocked=null;return {ok:true};
    });}catch{return this.block('LOCK_UNAVAILABLE');}
  }
  private block(errorCode:ErrorCode):RepositoryResult{this.loaded=false;this.blocked=errorCode;return {ok:false,errorCode};}
  private migrate():SaveData {
    const d=defaults(),get=(key:string)=>this.storage.getItem('paoku_'+key);
    const integer=(raw:string|null)=>raw!==null&&raw.trim()!==''&&validInteger(Number(raw))?Number(raw):0;
    d.walletCoins=integer(get('total_coins'));d.highScore=integer(get('high_score'));
    try{const owned:unknown=JSON.parse(get('unlocked_skins')??'[]');if(Array.isArray(owned))d.ownedSkinIds=['cyan',...SKIN_IDS.filter(id=>id!=='cyan'&&owned.includes(id))];}catch{/* field-specific default */}
    const selected=get('selected_skin');if(selected&&d.ownedSkinIds.includes(selected))d.selectedSkinId=selected;
    const volume=(raw:string|null,fallback:number)=>{if(raw===null||raw.trim()==='')return fallback;const n=Number(raw);return Number.isFinite(n)?Math.max(0,Math.min(1,n)):fallback;};
    d.audio={masterMuted:get('audio_master_muted')==='1',bgmEnabled:get('audio_bgm_enabled')!=='0',sfxEnabled:get('audio_sfx_enabled')!=='0',bgmVolume:volume(get('audio_bgm_volume'),0.6),sfxVolume:volume(get('audio_sfx_volume'),0.9)};
    return d;
  }
  private write(encoded:string):RepositoryResult {
    try{this.storage.setItem(SAVE_KEY,encoded);return {ok:true};}
    catch{try{if(this.storage.getItem(SAVE_KEY)===encoded)return {ok:true};}catch{/* unavailable */}return {ok:false,errorCode:'SAVE_FAILED'};}
  }
  async update(mutate:(draft:SaveData)=>void):Promise<RepositoryResult>{
    if(!this.loaded)return {ok:false,errorCode:this.blocked??'STORAGE_UNAVAILABLE'};
    try{return await this.lock(async()=>{
      let raw:string|null;try{raw=this.storage.getItem(SAVE_KEY);}catch{return {ok:false,errorCode:'STORAGE_UNAVAILABLE'};}
      if(raw!==this.token)return {ok:false,errorCode:'CONFLICT'};
      const draft=structuredClone(this.data);mutate(draft);
      if(draft.revision===Number.MAX_SAFE_INTEGER)return {ok:false,errorCode:'OVERFLOW'};
      draft.revision=this.data.revision+1;
      if(!validSave(draft))return {ok:false,errorCode:'CORRUPT_SAVE'};
      const encoded=JSON.stringify(draft),result=this.write(encoded);if(!result.ok)return result;
      this.data=draft;this.token=encoded;return {ok:true};
    });}catch{return {ok:false,errorCode:'LOCK_UNAVAILABLE'};}
  }
}
export function createBrowserSaveRepository():SaveRepository {
  const storage:SaveStorage={getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)};
  return new SaveRepository(storage);
}
