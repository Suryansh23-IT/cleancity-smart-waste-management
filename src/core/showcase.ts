import {City, clone} from './model';
import {blankCity} from './presets';
import {autoZone} from './zoning';
import {parsePhysical,PhysicalBin} from './physical';
export interface ShowcaseSnapshot {version:1; mode:'TEST'|'PHYSICAL';capturedAt:string; readings:PhysicalBin[]; fills:Record<string,number>}
export const mapping=Object.fromEntries([1,2,3,4].map(i=>[`BIN-00${i}`,`BIN-00${i}`]));
export function showcaseCity():City{
 const c=blankCity();c.showcase=true;c.id='showcase-ten-v1';c.name='Ten-bin hybrid showcase';c.description='PROVISIONAL editable layout · four mapped physical channels + six virtual bins. Physical-derived planning is a snapshot, never physical collection.';c.width=1100;c.height=700;c.nodes=[];c.roads=[];c.bins=[];c.trucks=[];
 for(let side=0;side<2;side++)for(let j=0;j<5;j++){const id=`show-${side}-${j}`;const pts=[[100,170],[280,110],[420,280],[300,490],[100,430]];c.nodes.push({id,label:side===0&&j===0?'Showcase collection depot':`${side?'East':'West'} access ${j}`,x:pts[j][0]+side*540,y:pts[j][1],type:side===0&&j===0?'HEAD':'INTERSECTION'});}
 const edge=(a:string,b:string)=>{for(const [from,to]of [[a,b],[b,a]])c.roads.push({id:`show-road-${c.roads.length}`,name:'Showcase neighborhood street',fromNodeId:from,toNodeId:to,distanceKm:.2,roadClass:'LOCAL'});};
 for(let s=0;s<2;s++)for(let j=0;j<5;j++)edge(`show-${s}-${j}`,`show-${s}-${(j+1)%5}`);edge('show-0-2','show-1-0');
 c.settings={...c.settings,zoneCount:1,seed:101};
 let virtual=4;
 c.bins=c.nodes.map((n,i)=>{const real=[1,2,6,7].indexOf(i);return {id:real>=0?`BIN-00${real+1}`:`BIN-${String(++virtual).padStart(3,'0')}`,name:real>=0?`REAL PHYSICAL · BIN-00${real+1} · awaiting snapshot`:`VIRTUAL · BIN-${String(virtual).padStart(3,'0')}`,roadNodeId:n.id,fillPercent:real>=0?0:15+i,capacityBinUnits:1,source:'SIMULATED',history:[]};});
 c.zones=autoZone(c,['show-0-0']).zones;c.trucks=c.zones.map((z,i)=>({id:`show-truck-${i}`,label:`Showcase ${i+1}`,zoneId:z.id,capacityBinUnits:3,speedGrade:2,available:true}));return c;
}
export function previewReadings(input:unknown,now=Date.now()):PhysicalBin[]{
 const d=input as {origin?:string;receiver?:{connected?:boolean}};if(d?.origin!=='LOCAL_USB'||!d.receiver?.connected)throw Error('Local receiver unavailable or disconnected');const rows=parsePhysical(input);
 for(const id of Object.keys(mapping)){const b=rows.find(b=>b.id===id),t=Date.parse(b?.receivedAt??'');if(!b||b.status!=='VALID'||!Number.isFinite(t)||now-t>10000||t>now+5000||b.distanceCm===null||b.fillPercent===null)throw Error(`${id}: requires fresh VALID calibrated reading`);const cal=b.calibration;if(!cal||!Number.isFinite(cal.emptyDistanceCm)||!Number.isFinite(cal.usableDepthCm)||cal.usableDepthCm<=0||cal.emptyDistanceCm>400||cal.emptyDistanceCm-cal.usableDepthCm<2)throw Error(`${id}: measured calibration required`);const expected=Math.max(0,Math.min(100,(cal.emptyDistanceCm-b.distanceCm)/cal.usableDepthCm*100));if(Math.abs(expected-b.fillPercent)>.01)throw Error(`${id}: calibration and stored fill disagree; await a new observation`);}
 return clone(rows);
}
export function testReadings(now=Date.now()) {return {source:'PHYSICAL',origin:'LOCAL_USB',staleAfterMs:10000,receiver:{connected:true},bins:Object.keys(mapping).map((id,i)=>({id,label:`TEST fixture ${id}`,deviceId:'TEST-only',distanceCm:[4.96,5.44,5.92,6.4][i],fillPercent:[92,88,84,80][i],receivedAt:new Date(now).toISOString(),status:'VALID',calibration:{emptyDistanceCm:16,usableDepthCm:12},history:[]}))};}
export function captureSnapshot(city:City,input:unknown,mode:'TEST'|'PHYSICAL',now=Date.now()):City{
 const readings=previewReadings(input,now);if(mode==='PHYSICAL'&&readings.some(b=>b.deviceId.startsWith('TEST')))throw Error('TEST fixtures cannot become physical evidence');
 if(city.bins.length!==10||new Set(city.bins.map(b=>b.id)).size!==10||Array.from({length:10},(_,i)=>`BIN-${String(i+1).padStart(3,'0')}`).some(id=>!city.bins.some(b=>b.id===id))||Object.values(mapping).some(id=>!city.bins.some(b=>b.id===id)))throw Error('Showcase requires its ten original mapped bins');
 const next=clone(city);for(const b of next.bins){const channel=Object.keys(mapping).find(k=>mapping[k]===b.id);if(channel){b.fillPercent=readings.find(r=>r.id===channel)!.fillPercent!;b.history=[];b.name=`${mode==='TEST'?'TEST PHYSICAL-DERIVED':'REAL PHYSICAL-DERIVED'} · ${channel}`;}}
 next.showcaseSnapshot={version:1,mode,capturedAt:new Date(now).toISOString(),readings,fills:Object.fromEntries(next.bins.map(b=>[b.id,b.fillPercent]))};return next;
}
