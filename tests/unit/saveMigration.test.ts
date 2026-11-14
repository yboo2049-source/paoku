import { describe, expect, it } from 'vitest';
import { SaveRepository, SAVE_KEY } from '../../src/application/saveRepository';

export class MemoryStorage {
  data = new Map<string, string>(); fail = false; afterWrite = false;
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.fail) throw Error('quota'); this.data.set(key, value); if (this.afterWrite) throw Error('ack lost'); }
}
export const lock = async <T>(work: () => Promise<T>): Promise<T> => work();
describe('PAO-14 migration and protected saves', () => {
  it('retries the original candidate rather than rerunning its mutator when an unknown write was not applied',async()=>{
    const s=new MemoryStorage(),r=new SaveRepository(s,lock);await r.load();const originalSet=s.setItem.bind(s),originalGet=s.getItem.bind(s);let failWrite=true,failRead=false,writes=0,mutations=0;
    s.setItem=(key,value)=>{writes++;if(failWrite){failWrite=false;failRead=true;throw Error('write failed');}originalSet(key,value);};s.getItem=key=>{if(failRead){failRead=false;throw Error('read failed');}return originalGet(key);};
    const mutate=(d:any)=>{mutations++;d.audio.masterMuted=!d.audio.masterMuted;};expect((await r.update(mutate,'same-operation')).ok).toBe(false);expect(r.snapshot.audio.masterMuted).toBe(false);expect((await r.update(mutate,'same-operation')).ok).toBe(true);expect(r.snapshot.audio.masterMuted).toBe(true);expect(r.snapshot.revision).toBe(1);expect(mutations).toBe(1);expect(writes).toBe(2);
  });
  it('serializes competing tabs and rejects stale writes without losing the winner',async()=>{
    let tail:Promise<unknown>=Promise.resolve(); const serial= <T>(work:()=>Promise<T>):Promise<T>=>{const next=tail.then(work);tail=next.catch(()=>{});return next;};
    const s=new MemoryStorage(),a=new SaveRepository(s,serial),b=new SaveRepository(s,serial);await Promise.all([a.load(),b.load()]);const results=await Promise.all([a.update(d=>{d.walletCoins=10;}),b.update(d=>{d.walletCoins=20;})]);expect(results.map(r=>r.ok)).toEqual([true,false]);expect(results[1].errorCode).toBe('CONFLICT');const refreshed=new SaveRepository(s,serial);await refreshed.load();expect(refreshed.snapshot.walletCoins).toBe(10);
  });
  it('migrates nine keys by field, retains rights and leaves backups', async () => {
    const s = new MemoryStorage();
    Object.entries({paoku_total_coins:'300',paoku_high_score:'broken',paoku_unlocked_skins:'["gold","purple","cyan","bad","gold"]',paoku_selected_skin:'gold',paoku_audio_master_muted:'1',paoku_audio_bgm_enabled:'0',paoku_audio_sfx_enabled:'1',paoku_audio_bgm_volume:'0.4',paoku_audio_sfx_volume:'Infinity'}).forEach(([k,v])=>s.data.set(k,v));
    const r = new SaveRepository(s, lock); expect((await r.load()).ok).toBe(true);
    expect(r.snapshot).toMatchObject({walletCoins:300,highScore:0,ownedSkinIds:['cyan','gold','purple'],selectedSkinId:'gold',audio:{masterMuted:true,bgmEnabled:false,sfxEnabled:true,bgmVolume:0.4,sfxVolume:0.9}});
    expect(s.getItem('paoku_total_coins')).toBe('300'); expect(s.getItem(SAVE_KEY)).not.toBeNull();
  });
  it.each(['NaN','Infinity','-1','1.2','9007199254740992','20oops'])('rejects invalid legacy integer %s', async value => {
    const s=new MemoryStorage(); s.data.set('paoku_total_coins',value); const r=new SaveRepository(s,lock); await r.load(); expect(r.snapshot.walletCoins).toBe(0);
  });
  it('does not let one damaged field erase legal wallet or skin rights',async()=>{
    const s=new MemoryStorage();s.data.set('paoku_total_coins','70');s.data.set('paoku_unlocked_skins','["pink","green"]');s.data.set('paoku_selected_skin','purple');const r=new SaveRepository(s,lock);await r.load();expect(r.snapshot.walletCoins).toBe(70);expect(r.snapshot.ownedSkinIds).toEqual(['cyan','pink','green']);expect(r.snapshot.selectedSkinId).toBe('cyan');
  });
  it('retries interrupted migration and never reimports old wallet after success',async()=>{
    const s=new MemoryStorage();s.data.set('paoku_total_coins','80');s.fail=true;const r=new SaveRepository(s,lock);expect((await r.load()).ok).toBe(false);s.fail=false;expect((await r.load()).ok).toBe(true);expect((await r.update(d=>{d.walletCoins=20;})).ok).toBe(true);const refreshed=new SaveRepository(s,lock);await refreshed.load();expect(refreshed.snapshot.walletCoins).toBe(20);
  });
  it('protects future and malformed records from overwriting or old-key replay',async()=>{
    for(const raw of ['{"schemaVersion":99,"walletCoins":500}','{bad']){const s=new MemoryStorage();s.data.set(SAVE_KEY,raw);s.data.set('paoku_total_coins','999');const r=new SaveRepository(s,lock);expect((await r.load()).ok).toBe(false);expect((await r.update(d=>{d.walletCoins=10;})).ok).toBe(false);expect(s.getItem(SAVE_KEY)).toBe(raw);}
  });
  it('rejects unavailable storage, lock and stale revision without memory commits',async()=>{
    const bad=new SaveRepository({getItem(){throw Error('denied');},setItem(){}},lock);expect((await bad.load()).ok).toBe(false);
    const s=new MemoryStorage();const a=new SaveRepository(s,lock),b=new SaveRepository(s,lock);await a.load();await b.load();await a.update(d=>{d.walletCoins=9;});expect((await b.update(d=>{d.walletCoins=4;})).errorCode).toBe('CONFLICT');expect(b.snapshot.walletCoins).toBe(0);const unlocked=new SaveRepository(s,async()=>{throw Error('no lock');});expect((await unlocked.load()).ok).toBe(false);
  });
  it('recovers a write whose acknowledgment throws from durable contents',async()=>{
    const s=new MemoryStorage();const r=new SaveRepository(s,lock);await r.load();s.afterWrite=true;expect((await r.update(d=>{d.walletCoins=42;})).ok).toBe(true);expect(r.snapshot.walletCoins).toBe(42);s.afterWrite=false;const refreshed=new SaveRepository(s,lock);await refreshed.load();expect(refreshed.snapshot.walletCoins).toBe(42);
  });
});
