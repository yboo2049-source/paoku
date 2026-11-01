import { describe, it, expect } from 'vitest';
import { identity, multiply, trs, transform, inverse, applyOnce, fitUniform, classify, logicalMarkers, visualRoots, rayY, parseGlb } from '../../tools/pao16-calibration/core';

describe('PAO16 calibration safeguards', () => {
  it('rejects invalid diagnostics rather than awarding a candidate', () => {
    expect(() => classify(NaN, false)).toThrow();
    expect(() => classify(Infinity, false)).toThrow();
    expect(() => fitUniform([[0,0,0],[NaN,1,0]], [[0,0,0],[1,1,0]])).toThrow();
  });
  it('parses indexed interleaved geometry through explicit parent matrix and child TRS', () => {
    const json = {asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{matrix:trs([2,3,4]),children:[1]},{translation:[0,1,0],rotation:[Math.SQRT1_2,0,0,Math.SQRT1_2],mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],buffers:[{byteLength:54}],bufferViews:[{buffer:0,byteOffset:0,byteLength:48,byteStride:16},{buffer:0,byteOffset:48,byteLength:6}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'},{bufferView:1,componentType:5123,count:3,type:'SCALAR'}]};
    const txt = Buffer.from(JSON.stringify(json)); const padded = Buffer.alloc(Math.ceil(txt.length/4)*4,32);txt.copy(padded);
    const bin=Buffer.alloc(56); [[0,0,-2],[1,0,-2],[0,1,-2]].forEach((p,i)=>p.forEach((n,j)=>bin.writeFloatLE(n,i*16+j*4))); [0,1,2].forEach((n,i)=>bin.writeUInt16LE(n,48+i*2));
    const out=Buffer.alloc(12+8+padded.length+8+bin.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(padded.length,12);out.writeUInt32LE(0x4e4f534a,16);padded.copy(out,20);out.writeUInt32LE(bin.length,20+padded.length);out.writeUInt32LE(0x004e4942,24+padded.length);bin.copy(out,28+padded.length);
    const g=parseGlb(new Uint8Array(out)); expect(g.triangles).toHaveLength(1);expect(g.triangles[0].node).toBe(1);expect(g.triangles[0].local[0]).toEqual([0,0,-2]);
    g.triangles[0].points[0].forEach((n,i)=>expect(n).toBeCloseTo([2,6,4][i]));
  });
  it('includes parent translation and child quaternion once, round trips', () => {
    const m=multiply(trs([2,3,4]),trs([0,1,0],[Math.SQRT1_2,0,0,Math.SQRT1_2]));
    const p=transform(m,[0,0,-2]); expect(p[0]).toBeCloseTo(2);expect(p[1]).toBeCloseTo(6);expect(p[2]).toBeCloseTo(4);
    transform(inverse(m),p).forEach((n,i)=>expect(n).toBeCloseTo([0,0,-2][i]));
  });
  it('rejects a second source conversion and nonfinite matrices',()=>{
    expect(()=>applyOnce(identity(),[0,0,0],1)).toThrow();
    const m=identity();m[0]=NaN;expect(()=>applyOnce(m,[0,0,0],0)).toThrow();
  });
  it('keeps nonzero base once, ramp and roof share endpoint',()=>{
    const p=logicalMarkers(5);expect(p.rampTop).toEqual([0,8,73]);expect(p.roofEntry).toEqual(p.rampTop);expect(p.rampMid).toEqual([0,6.5,70]);
  });
  it('has one engineering visual owner for two logical surfaces',()=>expect(visualRoots()).toEqual([{prefab:'ramp-engineering-truck',children:['RAMP','ROOF'],loadCount:1}]));
  it('reports uniform fit residual instead of stretching incompatible aspect',()=>{
    const f=fitUniform([[0,0,0],[1,0,0],[0,1,0]],[[0,0,0],[12,0,0],[0,3,0]]);
    expect(f.rms).toBeGreaterThan(1);expect(classify(f.rms,false)).toBe('NEEDS_DERIVED_REPAIR');expect(classify(0,true)).toBe('POINTS_REQUIRE_REVIEW');
  });
  it('takes clearance from triangle intersection, leaves absent ray null',()=>{
    const t={points:[[-1,2,-1],[1,2,-1],[0,2,1]],node:0,primitive:0,triangle:0} as any;
    expect(rayY([t],0,0)[0].point).toEqual([0,2,0]);expect(rayY([t],4,4)).toEqual([]);
  });
});
