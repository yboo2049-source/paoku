/** Diagnostic sampling only. Source scene coordinates, no gameplay ownership. */
import {rayY,cross,sub} from './core.ts';
import type {Triangle,V} from './core.ts';
export function normal(t:Triangle):V {
 const n=cross(sub(t.points[1],t.points[0]),sub(t.points[2],t.points[0]));const l=Math.hypot(...n);
 if(l<1e-15)throw Error('Degenerate face');return n.map(v=>v/l) as V;
}
export function buildRayIndex(triangles:Triangle[],size=48){
 const min=[Infinity,Infinity],max=[-Infinity,-Infinity];
 for(const t of triangles)for(const p of t.points){min[0]=Math.min(min[0],p[0]);min[1]=Math.min(min[1],p[2]);max[0]=Math.max(max[0],p[0]);max[1]=Math.max(max[1],p[2]);}
 const span=max.map((n,i)=>Math.max(n-min[i],1e-12));const buckets=new Map<string,Triangle[]>();
 const cell=(n:number,axis:number)=>Math.max(0,Math.min(size-1,Math.floor((n-min[axis])/span[axis]*size)));
 for(const t of triangles){const x=t.points.map(p=>p[0]),z=t.points.map(p=>p[2]);
  for(let i=cell(Math.min(...x),0);i<=cell(Math.max(...x),0);i++)for(let j=cell(Math.min(...z),1);j<=cell(Math.max(...z),1);j++){
   const key=i+','+j;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key)!.push(t);
  }
 }
 return {min,max,buckets,cell};
}
export function indexHits(idx:ReturnType<typeof buildRayIndex>,x:number,z:number){
 if(x<idx.min[0]||x>idx.max[0]||z<idx.min[1]||z>idx.max[1])return [];
 return rayY(idx.buckets.get(idx.cell(x,0)+','+idx.cell(z,1))??[],x,z);
}
export function evidence(h:ReturnType<typeof rayY>[number]){
 const t=h.triangle;return {point:h.point,local:[0,1,2].map(i=>t.local.reduce((s,p,k)=>s+p[i]*h.barycentric[k],0)),node:t.node,mesh:t.mesh,primitive:t.primitive,triangle:t.triangle,indices:t.indices,barycentric:h.barycentric,normal:normal(t)};
}
export function sampleGrid(idx:ReturnType<typeof buildRayIndex>,domain:number[],nx:number,nz:number){
 if(nx<2||nz<2||!domain.every(Number.isFinite))throw Error('Invalid sampling grid');
 const spacing=[(domain[1]-domain[0])/(nx-1),(domain[3]-domain[2])/(nz-1)];
 const cells=Array.from({length:nx*nz},(_,i)=>({x:domain[0]+(i%nx)*spacing[0],z:domain[2]+Math.floor(i/nx)*spacing[1]}));
 return {domain,nx,nz,spacing,continuousCertificate:false,numericBarycentricTolerance:1e-8,
  unsampledGeometryErrorBound:null,warning:'Half-cell spacing is localization resolution only, not a geometric error bound or continuous clearance proof',
  cells:cells.map(c=>{const hits=indexHits(idx,c.x,c.z).filter(h=>{try{normal(h.triangle);return true;}catch{return false;}});return {...c,top:hits.length?evidence(hits[hits.length-1]):null,bottom:hits.length?evidence(hits[0]):null,hitCount:hits.length};})};
}
export function regions(mask:boolean[],nx:number,nz:number){
 if(mask.length!==nx*nz)throw Error('Grid size mismatch');const seen=new Set<number>(),out:number[][]=[];
 for(let i=0;i<mask.length;i++){if(!mask[i]||seen.has(i))continue;const group=[i];seen.add(i);
  for(let k=0;k<group.length;k++){const p=group[k],x=p%nx,z=Math.floor(p/nx);for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,zz=z+dz,q=zz*nx+xx;if(xx>=0&&xx<nx&&zz>=0&&zz<nz&&mask[q]&&!seen.has(q)){seen.add(q);group.push(q);}}}
  out.push(group);
 }return out.sort((a,b)=>b.length-a.length);
}
export function sliceY(triangles:Triangle[],height:number){
 const segments:{points:V[];node:number;mesh:number;primitive:number;triangle:number}[]=[];
 for(const t of triangles){const points:V[]=[];for(let e=0;e<3;e++){const a=t.points[e],b=t.points[(e+1)%3];const d=b[1]-a[1];if(Math.abs(d)<1e-12)continue;const u=(height-a[1])/d;if(u<0||u>1)continue;const p=a.map((v,i)=>v+u*(b[i]-v)) as V;if(!points.some(q=>Math.hypot(...sub(q,p))<1e-10))points.push(p);}
  if(points.length===2)segments.push({points,node:t.node,mesh:t.mesh,primitive:t.primitive,triangle:t.triangle});
 }return segments;
}
export function transitionBands(points:{kind:string;x:number}[]){
 let best:number[]=[];let run:number[]=[];
 points.forEach((p,i)=>{if(p.kind==='incline'){run.push(i);if(run.length>best.length)best=[...run];}else run=[];});
 if(!best.length)return {footBracket:null,roofJoinBracket:null,exactEndpoint:null};
 const a=best[0],b=best[best.length-1],next=points.findIndex((p,i)=>i>b&&p.kind==='flat');
 return {footBracket:a>0?[points[a-1].x,points[a].x]:null,roofJoinBracket:next>b?[points[b].x,points[next].x]:null,exactEndpoint:null};
}
