import { City } from './model';
import { blankCity } from './presets';
import { autoZone } from './zoning';

// Authored street plans. Cross-street links terminate at real graph junctions.
export function createReadyCities(): City[] {
 const specs=[
  {name:'Briar Market Borough',rows:4,cols:6,bins:24,heads:[0,23],fleet:1,capacity:4,kind:'town'},
  {name:'Rivergate Crossing',rows:5,cols:8,bins:40,heads:[0,7],fleet:1,capacity:5,kind:'river'},
  {name:'Juniper Sector City',rows:6,cols:9,bins:54,heads:[0,8,49],fleet:1,capacity:5,kind:'modern'},
  {name:'Freightport Industrial',rows:7,cols:10,bins:70,heads:[0,9,65],fleet:2,capacity:8,kind:'industry'},
  {name:'Westhaven Metropolitan',rows:10,cols:10,bins:100,heads:[0,9,90,99],fleet:2,capacity:6,kind:'metro'},
 ];
 return specs.map((s,k)=>{
  const c:City=blankCity();c.id=`ready-${k+1}-v1`;c.name=s.name;c.width=1100;c.height=760;
  c.description=s.kind==='river'?'River Willow separates connected banks; two explicit bridges carry all cross-river collection.':s.kind==='industry'?'Freight yards, warehouse access streets and heavy industrial pickups.':s.kind==='town'?'Compact market high street, residential lanes and two neighborhood depots.':s.kind==='modern'?'Planned residential sectors with arterial avenues and commercial frontage.':'Dense central districts, offset outer neighborhoods and a connected multi-depot fleet.';
  c.nodes=[];c.roads=[];c.bins=[];c.zones=[];c.trucks=[];
  const id=(r:number,col:number)=>`j${r*s.cols+col}`;
  for(let r=0;r<s.rows;r++)for(let col=0;col<s.cols;col++){
   let x=100+col*900/(s.cols-1),y=100+r*560/(s.rows-1);
   if(s.kind==='river')x=col<4?100+col*105:685+(col-4)*105;
   if(s.kind==='town'){x+=r%2?18:0;y+=col%3===1?15:0;}
   if(s.kind==='metro'){x+=Math.sin(r*.8)*18;y+=Math.sin(col*.7)*22;}
   if(s.kind==='industry')y+=col>5?20:0;
   c.nodes.push({id:id(r,col),x,y,type:'INTERSECTION',label:`${['Market','Garden','Station','Civic','Orchard','Harbor','Foundry','School','Central','West'][r]} / ${col+1}`});
  }
  function edge(a:string,b:string,name:string,major:boolean){const p=c.nodes.find(n=>n.id===a)!,q=c.nodes.find(n=>n.id===b)!;const distanceKm=Number((Math.hypot(p.x-q.x,p.y-q.y)*.0025).toFixed(3));for(const [from,to] of [[a,b],[b,a]])c.roads.push({id:`road-${c.roads.length}`,fromNodeId:from,toNodeId:to,name,distanceKm,roadClass:major?'ARTERIAL':'LOCAL'});}
  for(let r=0;r<s.rows;r++)for(let col=0;col<s.cols;col++){
   if(col<s.cols-1&&!(s.kind==='river'&&col===3&&r!==1&&r!==3))edge(id(r,col),id(r,col+1),s.kind==='river'&&col===3?`${r===1?'North':'South'} Bridge`:r===Math.floor(s.rows/2)?'Municipal Avenue':`${c.nodes[r*s.cols].label.split(' /')[0]} Street`,r===Math.floor(s.rows/2)||s.kind==='river'&&col===3);
   const connect=s.kind==='town'?col===0||col===s.cols-1||r%2===col%2:s.kind==='industry'?col%3===0||r===2:s.kind==='metro'?col%2===0||r%3===0:true;
   if(r<s.rows-1&&connect)edge(id(r,col),id(r+1,col),s.kind==='industry'?'Freight access':`District ${col+1} Road`,col%3===0);
  }
  s.heads.forEach((n,i)=>{c.nodes[n].type='HEAD';c.nodes[n].label=`${s.name} depot ${i+1}`;});
  c.settings={...c.settings,strictZoneRouting:true,zoneCount:s.heads.length,seed:810+k};
  c.bins=c.nodes.map((n,i)=>({id:`bin-${i+1}`,name:`${s.name.split(' ')[0]} ${i+1}`,roadNodeId:n.id,fillPercent:[95,88,65,92,83,40,98,76][(i+k)%8],capacityBinUnits:s.kind==='industry'?1.8:1,source:'SIMULATED' as const,history:[]}));
  c.zones=autoZone(c,s.heads.map(n=>c.nodes[n].id)).zones;
  c.zones.forEach((z,i)=>{z.name=`${['Market','Riverside','Civic','West'][i]} service district`;for(let t=0;t<s.fleet;t++)c.trucks.push({id:`vehicle-${i}-${t}`,label:`${s.name.split(' ')[0]} ${i+1}${String.fromCharCode(65+t)}`,zoneId:z.id,capacityBinUnits:s.capacity,speedGrade:2,available:true});});
  return c;
 });
}
