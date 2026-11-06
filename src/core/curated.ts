import { City } from './model';
import { blankCity } from './presets';
import { autoZone } from './zoning';

// Authored demonstration networks. Coordinates are visual; edge distances are
// explicit modeled kilometres, never calculated from SVG pixels.
export function createCuratedCities(): City[] {
 const cities:City[]=[];
 function town(name:string,description:string):City {
  const c=blankCity();c.id=`curated-${cities.length+1}-v2`;c.name=name;c.description=description;
  c.width=1100;c.height=760;c.nodes=[];c.roads=[];c.bins=[];c.zones=[];c.trucks=[];c.settings={...c.settings,seed:600+ cities.length};cities.push(c);return c;
 }
 function node(c:City,x:number,y:number,label:string){const id=`p${c.nodes.length}`;c.nodes.push({id,x,y,label,type:'INTERSECTION'});return c.nodes.length-1;}
 function road(c:City,a:number,b:number,name:string,km=.22,two=true,major=false){
  const add=(from:number,to:number)=>c.roads.push({id:`r${c.roads.length}`,fromNodeId:`p${from}`,toNodeId:`p${to}`,distanceKm:km,name,roadClass:major?'ARTERIAL':'LOCAL'});
  add(a,b);if(two)add(b,a);
 }
 function finish(c:City,heads:number[],bins:number,trucksPerZone=1,capacity=4){
  heads.forEach((i,j)=>{c.nodes[i].type='HEAD';c.nodes[i].label=`${c.name} depot ${j+1}`;});c.settings.zoneCount=heads.length;
  for(let i=0;i<bins;i++){
   const fill=[94,86,52,97,81,35,90,65][i%8];
   c.bins.push({id:`b${i+1}`,name:`${c.name.split(' ')[0]} collection ${String(i+1).padStart(3,'0')}`,roadNodeId:`p${i%c.nodes.length}`,fillPercent:fill,capacityBinUnits:c.name==='Ironworks Estate'?1.8:1,source:'SIMULATED',history:[0,1,2,3,4].map(h=>({time:h*3600000,fill:Math.max(0,fill-12+3*h)}))});
  }
  const z=autoZone(c,heads.map(i=>`p${i}`));c.zones=z.zones.map((zone,i)=>({...zone,id:`zone-${i+1}`,name:`${['North','East','South','West'][i]} service area`}));
  c.zones.forEach((zone,j)=>{for(let i=0;i<trucksPerZone;i++)c.trucks.push({id:`truck-${j+1}-${i+1}`,label:`${c.name.split(' ')[0]} ${j+1}${String.fromCharCode(65+i)}`,zoneId:zone.id,capacityBinUnits:capacity,speedGrade:2,available:true});});
 }
 // Compact town: linked market squares with a western depot and short loop.
 {
  const c=town('Cedar Market Town','A walkable market town: two connected squares, short collection rounds and one depot. Start here for a first dispatch.');
  [[180,230],[400,180],[650,210],[860,280],[870,500],[640,570],[390,550],[180,470],[410,350],[650,370],[260,340],[760,450]].forEach(([x,y],i)=>node(c,x,y,`Market place ${i+1}`));
  for(let i=0;i<8;i++)road(c,i,(i+1)%8,'Market circuit');
  [[0,10],[10,7],[10,8],[8,1],[8,6],[8,9],[9,2],[9,5],[9,11],[11,3],[11,4]].forEach(([a,b])=>road(c,a,b,'Town lane',.16));finish(c,[0],12,1,3);
 }
 // Residential: three permeable neighborhood blocks and a shared avenue.
 {
  const c=town('Meadowbrook Gardens','Planned residential neighborhoods around garden courts, connected by a central avenue. Three local depots distribute regular household demand.');
  for(let row=0;row<5;row++)for(let col=0;col<6;col++)node(c,130+col*165+(row%2)*12,120+row*125,`${['Oak','Elm','Lime','Ash','Birch'][row]} corner ${col+1}`);
  for(let r=0;r<5;r++)for(let k=0;k<5;k++)road(c,r*6+k,r*6+k+1,r===2?'Garden Avenue':'Residential street',r===2?.35:.18,true,r===2);
  for(let r=0;r<4;r++)for(let k=0;k<6;k++)if(k%2===0||r%2===0)road(c,r*6+k,(r+1)*6+k,'Neighborhood link',.16);
  finish(c,[0,5,27],36,1,4);
 }
 // Riverside: no bank-to-bank edges except two explicit bridge crossings.
 {
  const c=town('Willowbridge Riverside','River Willow separates two irregular riverbank neighborhoods. Two marked bridges are the only road connections across the water.');
  const left=[[120,140],[280,110],[410,170],[430,300],[360,420],[420,580],[230,650],[120,510],[180,360],[270,240],[240,470],[330,560],[100,270],[340,330]];
  [...left,...left.map(([x,y])=>[1100-x,y+12])].forEach(([x,y],i)=>node(c,x,y,`${i<14?'Westbank':'Eastbank'} place ${i%14+1}`));
  for(const offset of [0,14]){for(let i=0;i<8;i++)road(c,offset+i,offset+(i+1)%8,'Riverside Drive',.28,true,true);[[0,12],[12,8],[8,7],[8,9],[9,1],[9,2],[9,13],[13,3],[13,4],[4,10],[10,11],[11,5],[11,6]].forEach(([a,b])=>road(c,a+offset,b+offset,'Bank lane',.18));}
  road(c,3,17,'North Bridge',.62,true,true);road(c,5,19,'South Bridge',.68,true,true);finish(c,[0,14],32,1,4);
 }
 // Industrial: paired long logistics corridors with short warehouse access spurs.
 {
  const c=town('Ironworks Estate','Warehouse yards and production blocks flank two broad logistics corridors. Concentrated industrial bins carry 1.8 bin units each and require larger vehicles.');
  for(let row=0;row<4;row++)for(let col=0;col<6;col++)node(c,120+col*170+(row===1?20:0),130+row*165,`${['Foundry','Freight','Assembly','Depot'][row]} gate ${col+1}`);
  for(let row=0;row<4;row++)for(let col=0;col<5;col++)road(c,row*6+col,row*6+col+1,row%2?'Freight Boulevard':'Factory service road',row%2?.48:.24,true,row%2===1);
  for(let col=0;col<6;col++)for(let row=0;row<3;row++)if(col===0||col===5||row===1)road(c,row*6+col,(row+1)*6+col,'Warehouse access',.2);
  finish(c,[0,23],30,1,6);
 }
 // Historic: a one-way perimeter and inner circuits, with radial access links.
 {
  const c=town('Amberfort Old Quarter','A historic oval of narrow one-way lanes and irregular inner squares. Continuous one-way circuits preserve access; return trips must respect their direction.');
  for(let ring=0;ring<3;ring++)for(let i=0;i<12;i++){const a=i*Math.PI/6+(ring===1?.08:0), irregular=1+.1*Math.sin(i*2.3+ring);node(c,550+Math.cos(a)*(420-ring*125)*irregular+Math.sin(i*1.7+ring)*18,380+Math.sin(a)*(275-ring*80)*irregular+Math.cos(i*1.2)*13,`${['Wall','Craft','Temple'][ring]} junction ${i+1}`);}
  for(let ring=0;ring<3;ring++)for(let i=0;i<12;i++)road(c,ring*12+i,ring*12+(i+1)%12,ring===0?'Fort Ring':'Heritage lane',ring===0?.25:.12,false,ring===0);
  for(let i=0;i<12;i+=2){road(c,i,12+i,'Gate passage',.15);road(c,12+i,24+i,'Temple approach',.1);}
  finish(c,[0,18],45,1,3);
 }
 // Metro: six nested angular rings, twelve radial avenues, four depots.
 {
  const c=town('Aster Metropolitan','A metropolitan ring-and-spoke network: twelve radial avenues, six orbital streets, four service areas and eight trucks serving 100 bins.');
  for(let ring=0;ring<6;ring++)for(let i=0;i<12;i++){const a=i*Math.PI/6;node(c,550+Math.cos(a)*(90+ring*73),380+Math.sin(a)*(60+ring*49),`Orbital ${ring+1} / avenue ${i+1}`);}
  for(let ring=0;ring<6;ring++)for(let i=0;i<12;i++)road(c,ring*12+i,ring*12+(i+1)%12,`Orbital ${ring+1}`, .16+ring*.035,true,ring===3||ring===5);
  for(let ring=0;ring<5;ring++)for(let i=0;i<12;i++)road(c,ring*12+i,(ring+1)*12+i,`Avenue ${i+1}`, .21,true,i%3===0);
  finish(c,[60,63,66,69],100,2,4.5);
 }
 return cities;
}
