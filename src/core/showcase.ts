import {boardGraph,binSites,board} from './showcaseLayout';
import {City, clone, defaultTruckCapacity} from './model';
import {blankCity} from './presets';
import {autoZone} from './zoning';
import {cloudReadingAge,cloudStaleMs,parsePhysical,physicalChannels,type PhysicalBin,type PhysicalOrigin} from './physical';
export interface ShowcaseSnapshot {version:1; mode:'TEST'|'PHYSICAL'; origin?:PhysicalOrigin;capturedAt:string; readings:PhysicalBin[]; fills:Record<string,number>}
export const mapping=Object.fromEntries(physicalChannels.map(id=>[id,id]));
export function showcaseCity():City{
 const c=blankCity();c.showcase=true;c.id='showcase-ten-board-v2';c.name='CleanCity 90 x 60 showcase';c.description='Shared physical/digital 90 x 60 cm board. Model distances are illustrative, not measured municipal km. Four central REAL mounts; six VIRTUAL bins. Physical fit requires actual bin and wire measurements.';c.width=board.width;c.height=board.height;
 Object.assign(c,boardGraph());c.settings={...c.settings,zoneCount:1,seed:101};
 c.bins=binSites.map((p,i)=>({id:p.id,name:i<4?`REAL PHYSICAL · ${p.id} · awaiting snapshot`:`VIRTUAL · ${p.id}`,roadNodeId:p.access,position:{x:p.x,y:p.y},fillPercent:i<4?0:15+i,capacityBinUnits:1,source:'SIMULATED',history:[]}));
 c.zones=autoZone(c,['depot']).zones;c.trucks=[{id:'show-truck-0',label:'Showcase truck',zoneId:c.zones[0].id,capacityBinUnits:defaultTruckCapacity,speedGrade:2,available:true}];return c;
}
export function previewReadings(input:unknown,now=Date.now()):PhysicalBin[]{
 const d=input as {origin?:PhysicalOrigin;receiver?:{connected?:boolean}};
 const cloud=d?.origin==='CLOUD_WIFI'||d?.origin==='CLOUD_TEST';
 if(!cloud&&(d?.origin!=='LOCAL_USB'||!d.receiver?.connected))throw Error('Local receiver unavailable or disconnected');
 const rows=parsePhysical(input);
 for(const id of Object.keys(mapping)){const b=rows.find(b=>b.id===id),t=Date.parse(b?.receivedAt??'');const stale=cloud?cloudReadingAge(b,now)>cloudStaleMs:!Number.isFinite(t)||now-t>10000||t>now+5000;if(!b||b.status!=='VALID'||stale||b.distanceCm===null||b.fillPercent===null)throw Error(`${id}: requires fresh VALID calibrated reading`);const cal=b.calibration;if(!cal||!Number.isFinite(cal.emptyDistanceCm)||!Number.isFinite(cal.usableDepthCm)||cal.usableDepthCm<=0||cal.emptyDistanceCm>400||cal.emptyDistanceCm-cal.usableDepthCm<2)throw Error(`${id}: measured calibration required`);const expected=Math.max(0,Math.min(100,(cal.emptyDistanceCm-b.distanceCm)/cal.usableDepthCm*100));if(Math.abs(expected-b.fillPercent)>.01)throw Error(`${id}: calibration and stored fill disagree; await a new observation`);}
 return clone(rows);
}
export function testReadings(now=Date.now()) {return {source:'PHYSICAL',origin:'LOCAL_USB',staleAfterMs:10000,receiver:{connected:true},bins:Object.keys(mapping).map((id,i)=>({id,label:`TEST fixture ${id}`,deviceId:'TEST-only',distanceCm:[4.96,5.44,5.92,6.4][i],fillPercent:[92,88,84,80][i],receivedAt:new Date(now).toISOString(),status:'VALID',calibration:{emptyDistanceCm:16,usableDepthCm:12},history:[]}))};}
export function captureSnapshot(city:City,input:unknown,mode:'TEST'|'PHYSICAL',now=Date.now()):City{
 const readings=previewReadings(input,now);const origin=(input as {origin:PhysicalOrigin}).origin;
 if(mode==='PHYSICAL'&&(origin==='CLOUD_TEST'||readings.some(b=>b.deviceId.startsWith('TEST'))))throw Error('TEST fixtures cannot become physical evidence');
 if(city.bins.length!==10||new Set(city.bins.map(b=>b.id)).size!==10||Array.from({length:10},(_,i)=>`BIN-${String(i+1).padStart(3,'0')}`).some(id=>!city.bins.some(b=>b.id===id))||Object.values(mapping).some(id=>!city.bins.some(b=>b.id===id)))throw Error('Showcase requires its ten original mapped bins');
 const next=clone(city);for(const b of next.bins){const channel=Object.keys(mapping).find(k=>mapping[k]===b.id);if(channel){b.fillPercent=readings.find(r=>r.id===channel)!.fillPercent!;b.history=[];b.name=`${mode==='TEST'?'TEST PHYSICAL-DERIVED':'REAL PHYSICAL-DERIVED'} · ${channel}`;}}
 next.showcaseSnapshot={version:1,mode,origin,capturedAt:new Date(now).toISOString(),readings,fills:Object.fromEntries(next.bins.map(b=>[b.id,b.fillPercent]))};return next;
}
