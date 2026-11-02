import {it,expect} from 'vitest';
import {buildRayIndex,indexHits,normal,sliceY,regions,sampleGrid,transitionBands} from '../../tools/pao16-calibration/refinement-core';
import {rayY} from '../../tools/pao16-calibration/core';
const tri=(points:number[][],id=0)=>({points,local:points,node:0,mesh:0,primitive:0,triangle:id,indices:[id*3,id*3+1,id*3+2]}) as any;
const ts=[tri([[-1,2,-1],[1,2,-1],[1,2,1]]),tri([[-1,2,-1],[1,2,1],[-1,2,1]],1)];
it('indexed hits equal exhaustive triangles at grid boundaries; outside remains empty',()=>{
 const idx=buildRayIndex(ts,8);for(const [x,z] of [[0,0],[-1,-1],[1,1],[.3,-.2],[3,0]])expect(indexHits(idx,x,z).map(h=>h.point)).toEqual(rayY(ts,x,z).map(h=>h.point));
});
it('normal distinguishes flat and incline without imposing winding semantics',()=>{
 expect(Math.abs(normal(ts[0])[1])).toBeCloseTo(1);
 const n=normal(tri([[0,0,0],[1,.5,0],[0,0,1]]));expect(Math.abs(n[0]/n[1])).toBeCloseTo(.5);
 expect(()=>normal(tri([[0,0,0],[0,0,0],[0,0,0]]))).toThrow();
});
it('4-neighbour regions preserve holes and never join diagonal samples',()=>{
 expect(regions([true,false,false,true],2,2).map(r=>r.length)).toEqual([1,1]);
 expect(regions([true,true,true,true,false,true,true,true,true],3,3)[0]).not.toContain(4);
});
it('horizontal section uses triangle edge intersections with provenance',()=>{
 const s=sliceY([tri([[-1,0,0],[1,0,0],[0,2,0]],7)],1);expect(s).toHaveLength(1);expect(s[0].triangle).toBe(7);expect(s[0].points).toEqual([[.5,1,0],[-.5,1,0]]);
});
it('sampling reports coverage and uncertainty, never a continuous certificate',()=>{
 const grid=sampleGrid(buildRayIndex(ts,8),[-1,1,-1,1],3,3);expect(grid.cells).toHaveLength(9);expect(grid.spacing).toEqual([1,1]);expect(grid.continuousCertificate).toBe(false);expect(grid.cells[4].top.point).toEqual([0,2,0]);
});
it('a ray through a gap remains unknown, not the nearest supporting height',()=>{
 const grid=sampleGrid(buildRayIndex([tri([[-1,0,-1],[-.5,0,-1],[-1,0,1]])],8),[-1,1,-1,1],3,3);expect(grid.cells[4].top).toBeNull();
});
it('transition band retains a rounded other zone instead of claiming an exact seam',()=>{
 const b=transitionBands(['other','incline','incline','other','other','flat'].map((kind,x)=>({kind,x})));
 expect(b.footBracket).toEqual([0,1]);expect(b.roofJoinBracket).toEqual([2,5]);expect(b.exactEndpoint).toBeNull();
});
it('rectangular grid dimensions keep x columns and z rows distinct',()=>{
 const g=sampleGrid(buildRayIndex(ts,8),[-1,1,-1,1],3,5);expect(g.cells[3].x).toBe(-1);expect(g.cells[3].z).toBe(-.5);
});
