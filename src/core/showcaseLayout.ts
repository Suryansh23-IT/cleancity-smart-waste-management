import type {City} from './model';
export const board={width:900,height:600,realPadWidth:60,realPadHeight:55};
export function isBoardShowcase(city:City){return !!city.showcase && city.nodes.some(n=>n.id==='real-access-1') && city.nodes.some(n=>n.id==='depot');}
export const binSites=[
{id:'BIN-001',x:390,y:260,access:'real-access-1'},
{id:'BIN-002',x:480,y:260,access:'real-access-2'},
{id:'BIN-003',x:365,y:365,access:'real-access-3'},
{id:'BIN-004',x:490,y:365,access:'real-access-4'},
{id:'BIN-005',x:150,y:145,access:'west-north'},
{id:'BIN-006',x:455,y:170,access:'center-north'},
{id:'BIN-007',x:760,y:145,access:'east-north'},
{id:'BIN-008',x:135,y:365,access:'west-south'},
{id:'BIN-009',x:790,y:365,access:'east-south'},
{id:'BIN-010',x:740,y:490,access:'south-east'},
];
export function boardGraph():Pick<City,'nodes'|'roads'>{
 const nodes:City['nodes']=[],roads:City['roads']=[],byPoint=new Map<string,string>();
 function point(x:number,y:number,id?:string){const key=x+','+y;if(byPoint.has(key))return byPoint.get(key)!;id??='J'+(nodes.length+1);nodes.push({id,label:id,x,y,type:id==='depot'?'HEAD':'INTERSECTION'});byPoint.set(key,id);return id;}
 // Named service points and junctions trace the approved reference, not a grid.
 for(const [id,x,y]of [['depot',135,550],['west-north',150,180],['center-north',455,200],['east-north',760,180],['west-south',100,365],['east-south',820,365],['south-east',740,520],['real-access-1',320,260],['real-access-2',535,260],['real-access-3',320,365],['real-access-4',490,410]] as [string,number,number][])point(x,y,id);
 function lane(pts:number[][],name:string,km=.12){for(let i=1;i<pts.length;i++){const a=point(...pts[i-1] as [number,number]),b=point(...pts[i] as [number,number]);for(const [from,to]of [[a,b],[b,a]]){if(roads.some(r=>r.fromNodeId===from&&r.toNodeId===to))continue;roads.push({id:'board-road-'+(roads.length+1),fromNodeId:from,toNodeId:to,name,distanceKm:km,roadClass:'LOCAL'});}}}
 lane([[100,300],[82,299],[70,291],[64,277],[64,202],[67,189],[77,182],[90,180],[150,180],[250,180]],'West neighborhood');
 lane([[250,180],[250,147],[254,128],[264,115],[280,109],[310,107],[360,105],[410,108],[455,110],[650,110],[715,110],[735,113],[748,122],[756,136],[760,152],[760,180]],'North circuit');
 lane([[250,180],[250,222],[254,235],[266,244],[280,247],[320,247],[350,227],[390,200],[455,200],[490,200],[507,208],[520,225],[535,247],[590,247],[620,247],[637,240],[647,225],[650,210],[650,180],[650,110]],'Park circuit');
 lane([[455,110],[455,200]],'Park entrance');lane([[650,180],[760,180]],'East neighborhood');
 lane([[760,180],[820,180],[835,185],[844,197],[847,212],[847,275],[844,288],[835,297],[820,300],[730,300],[680,300],[600,300],[535,300]],'East circuit');
 lane([[100,300],[200,300],[320,300],[405,315],[445,315],[460,307],[475,300],[535,300]],'Central avenue');
 lane([[320,247],[320,260],[320,300],[320,365],[320,410]],'Central west street');lane([[535,247],[535,260],[535,300],[535,410]],'Central east street');
 lane([[100,300],[100,365],[100,450],[104,470],[115,485],[130,490],[175,490],[200,490],[215,486],[226,476],[233,458],[240,438],[252,421],[269,412],[285,410],[320,410],[490,410],[535,410],[625,410],[650,407],[668,398],[677,383],[680,365],[680,300]],'South Street');
 lane([[200,300],[200,365],[197,382],[186,392],[170,395],[100,395]],'West court');
 lane([[730,300],[730,365],[735,385],[748,394],[765,395],[820,395]],'East court');
 lane([[820,300],[820,365],[820,395],[820,480],[816,499],[805,513],[790,520],[740,520],[550,520],[520,523],[502,535],[490,545],[475,550],[260,550],[260,520],[240,503],[200,490]],'South circuit');
 lane([[135,550],[135,490],[130,490]],'Depot access',.08);
 // Split every geometric meeting at an actual shared graph node, including T junctions.
 const physical=roads.filter((_,i)=>i%2===0),lookup=()=>new Map(nodes.map(n=>[n.id,n]));
 let nodeMap=lookup();
 for(let i=0;i<physical.length;i++)for(let j=i+1;j<physical.length;j++){const a=nodeMap.get(physical[i].fromNodeId)!,b=nodeMap.get(physical[i].toNodeId)!,c=nodeMap.get(physical[j].fromNodeId)!,d=nodeMap.get(physical[j].toNodeId)!;const dx=b.x-a.x,dy=b.y-a.y,ex=d.x-c.x,ey=d.y-c.y,den=dx*ey-dy*ex;if(Math.abs(den)<1e-8)continue;const t=((c.x-a.x)*ey-(c.y-a.y)*ex)/den,u=((c.x-a.x)*dy-(c.y-a.y)*dx)/den;if(t>1e-7&&t<1-1e-7&&u>1e-7&&u<1-1e-7)point(a.x+t*dx,a.y+t*dy);}
 nodeMap=lookup();const normalized:City['roads']=[];
 for(const r of roads){const a=nodeMap.get(r.fromNodeId)!,b=nodeMap.get(r.toNodeId)!,dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;const chain=nodes.map(n=>({n,t:((n.x-a.x)*dx+(n.y-a.y)*dy)/len})).filter(({n,t})=>t>=-1e-8&&t<=1+1e-8&&Math.abs((n.x-a.x)*dy-(n.y-a.y)*dx)<1e-5).sort((a,b)=>a.t-b.t);for(let k=1;k<chain.length;k++){const from=chain[k-1],to=chain[k];if(to.t-from.t<1e-8||normalized.some(e=>e.fromNodeId===from.n.id&&e.toNodeId===to.n.id))continue;normalized.push({...r,id:'board-road-'+(normalized.length+1),fromNodeId:from.n.id,toNodeId:to.n.id,distanceKm:r.distanceKm*(to.t-from.t)});}}
 return {nodes,roads:normalized};
}
const esc=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export function showcaseArtwork(city:City,markers=true){
 const n=new Map(city.nodes.map(n=>[n.id,n]));let s='<rect width="900" height="600" fill="#f9f7ee"/><rect x="16" y="76" width="868" height="438" rx="20" fill="#eaf0df"/>';
 const rect=(x:number,y:number,w:number,h:number,fill:string,rx=3)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
 const text=(x:number,y:number,t:string,size=9,color='#426257')=>`<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" fill="${color}">${esc(t)}</text>`;
 s+=text(26,38,'CleanCity',27,'#174e3e')+text(26,58,'SMART WASTE MANAGEMENT  /  PHYSICAL + DIGITAL CITY',8);
 s+=text(485,35,'1 DEPOT   /   1 TRUCK   /   1 ZONE',12,'#174e3e')+text(485,54,'90 x 60 cm board  |  4 real bins + 6 virtual locations',9);
 // The approved reference uses scattered low-rise footprints, green courts and a pond.
 s+=rect(470,125,165,103,'#d0e4b2',12)+rect(385,335,95,58,'#d9e8be',10);
 s+='<path d="M530,169 C523,151 549,146 560,155 C580,141 603,155 595,176 C579,191 550,188 530,180Z" fill="#96cde1"/>';
 const segments=city.roads.map(r=>[n.get(r.fromNodeId)!,n.get(r.toNodeId)!]);
 const nearRoad=(x:number,y:number,pad:number)=>segments.some(([a,b])=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a.x-t*dx,y-a.y-t*dy)<pad;});
 for(let row=0;row<15;row++)for(let col=0;col<23;col++){const x=36+col*36+(row%2)*9,y=90+row*30,green=(row*13+col*7)%11===0;
 if(y>510||nearRoad(x+10,y+9,23)||city.bins.some(b=>Math.abs((b.position?.x??0)-(x+10))<43&&Math.abs((b.position?.y??0)-(y+9))<39)||(x>460&&x<640&&y<235)||(x>375&&x<490&&y>325&&y<400))continue;
 if(green){s+=rect(x-3,y-3,27,27,'#d5e9b2',4)+`<circle cx="${x+10}" cy="${y+8}" r="7" fill="#a4c77e"/><circle cx="${x+8}" cy="${y+6}" r="4" fill="#b8d592"/>`;}else{s+=rect(x,y,22+(col%3)*3,18+(row%2)*4,'#e7ddcc',2)+rect(x+2,y+2,10,6,'#eee7d9',1);}}
 for(const [x,y]of [[487,145],[510,205],[613,153],[610,212],[400,350],[450,370],[800,465],[60,420],[295,135]])s+=`<circle cx="${x}" cy="${y}" r="9" fill="#c3dca1"/><circle cx="${x-2}" cy="${y-3}" r="6" fill="#a7c97f"/>`;
 s+=text(500,140,'WILLOW PARK',7)+text(401,389,'GARDEN COURT',6);
 const seen=new Set<string>();const lines:string[]=[];
 for(const r of city.roads){const key=[r.fromNodeId,r.toNodeId].sort().join('|');if(seen.has(key))continue;seen.add(key);const a=n.get(r.fromNodeId)!,b=n.get(r.toNodeId)!;lines.push(`M${a.x},${a.y} L${b.x},${b.y}`);}
 const d=lines.join(' ');s+=`<path d="${d}" fill="none" stroke="#bac4b8" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fffdf7" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`;
 for(const p of city.nodes.filter(n=>n.type!=='HEAD'&&new Set(city.roads.filter(r=>r.fromNodeId===n.id).map(r=>r.toNodeId)).size>=3))s+=`<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="#e3e8df"/>`;
 // Bin access guides are associations, NOT routable street links or a fixed truck route.
 for(const [i,b]of city.bins.slice(0,4).entries()){const p=b.position??n.get(b.roadNodeId)!,a=n.get(b.roadNodeId)!;s+=`<path d="M${p.x},${p.y} L${a.x},${a.y}" stroke="#c55c50" stroke-width=".8" stroke-dasharray="2 2" fill="none"/><circle cx="${a.x}" cy="${a.y}" r="3" fill="#c74438" stroke="white" stroke-width="1"/><rect x="${a.x-19}" y="${a.y-11}" width="14" height="9" rx="2" fill="white"/>`+text(a.x-18,a.y-4,'A'+(i+1),6,'#ad3e32');}
 // Design footprint is an assumption; report actual miniature bin size before printing.
 for(const b of city.bins){const p=b.position??n.get(b.roadNodeId)!;const real=/^BIN-00[1-4]$/.test(b.id);if(real)s+=`<rect x="${p.x-30}" y="${p.y-27.5}" width="60" height="55" rx="5" fill="#fff5ea" stroke="#ddbc9e" stroke-width=".7" stroke-dasharray="2 2"/>`;if(markers){const color=real?'#d64b3f':'#338c52';s+=`<g transform="translate(${p.x},${p.y})"><rect x="-9" y="-13" width="18" height="21" rx="4" fill="${color}"/><path d="M-5,-7 H5 M-3,-9 H3 M-3,-4 V4 M0,-4 V4 M3,-4 V4" stroke="white" stroke-width="1"/><rect x="-22" y="10" width="44" height="11" rx="3" fill="white"/>${text(-19,18,b.id,7,'#254c3c')}${real?text(-25,-18,['A1: CENTRAL WEST','A2: CENTRAL EAST','A3: CENTRAL WEST','A4: SOUTH STREET'][Number(b.id.slice(-1))-1],4.7,'#914c40'):''}</g>`;}}
 const depot=city.nodes.find(n=>n.type==='HEAD')!;s+=rect(depot.x-30,depot.y-23,75,48,'#e3e9e1',5);s+=text(depot.x-23,depot.y+19,'DEPOT',8,'#275e6c');if(markers)s+=`<g transform="translate(${depot.x+28},${depot.y+2})"><rect x="-8" y="-5" width="11" height="7" rx="1" fill="#2a8064"/><path d="M3,-4 H7 L10,0 V2 H3Z" fill="#3b9978"/><circle cx="-5" cy="3" r="2" fill="#34443f"/><circle cx="7" cy="3" r="2" fill="#34443f"/></g><path d="M${depot.x-18},${depot.y-7} l18,-12 l18,12 v18 h-36z" fill="#39758b"/><rect x="${depot.x-6}" y="${depot.y}" width="12" height="11" fill="#f8f6e9"/>`;
 s+=text(320,573,'RED: REAL BIN MOUNT   GREEN: VIRTUAL   A1-A4: ROAD ACCESS',8)+text(320,587,'Dashed red guides link bins to road access points; they are not collection routes.',7);
 return s;
}
export function showcaseSvg(city:City){return `<svg xmlns="http://www.w3.org/2000/svg" width="90cm" height="60cm" viewBox="0 0 900 600">${showcaseArtwork(city)}</svg>`;}
