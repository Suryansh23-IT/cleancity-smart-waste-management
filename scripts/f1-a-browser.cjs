// Isolated real Chromium verification. No user profile or desktop automation.
const {spawn}=require('node:child_process');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const out=path.resolve('build/f1-a-e2e');
const base=process.env.CLEANCITY_TEST_URL || 'http://127.0.0.1:5177';
let browser, socket, profile, seq=0;
const pending=new Map(), errors=[], results=[];
async function call(method,params={}) {
 const id=++seq;
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error(`CDP timeout: ${method}`));},15000);pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r)},reject:e=>{clearTimeout(timer);reject(e)}});socket.send(JSON.stringify({id,method,params}));});
}
async function js(expression) {const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function click(name) {
 if(name==='Pause'&&process.env.CLEANCITY_READY==='1'){
  const transforms=()=>js(`JSON.stringify([...document.querySelectorAll('svg g[aria-label^="Select "]')].map(g=>g.getAttribute('transform')))`);
  const before=await transforms();await delay(1400);assert.notEqual(await transforms(),before,'Real-time truck positions must change');
 }
 const rect=await js(`(()=>{const b=[...document.querySelectorAll('button,summary,[role=button]')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(name)}||(b.innerText||b.textContent).replace(/\\s+/g,' ').trim()===${JSON.stringify(name)});if(!b)throw Error('Missing action: '+${JSON.stringify(name)});for(let p=b.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;if(b.disabled)throw Error('Disabled action');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...rect});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...rect});await delay(100);
}
async function fill(selector,value) {await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing field');const p=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);await delay(60);}
async function submit(selector){await js(`document.querySelector(${JSON.stringify(selector)}).requestSubmit()`);await delay(100);}
async function text(){return js('document.body.innerText');}
async function library(){return js(`JSON.parse(localStorage.getItem('cleancity.scenarios.v1')||'[]')`);}
async function shot(name){await js(name.startsWith('city-')&&(name.endsWith('desktop')||name.endsWith('moving')||name.endsWith('mobile'))?`document.querySelector('#city-map')?.scrollIntoView({block:'start'})`:'window.scrollTo(0,0)');await delay(150);const s=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(path.join(out,name+'.png'),Buffer.from(s.data,'base64'));}
async function check(name,fn){const started=Date.now();try{await fn();results.push({name,status:'PASS',ms:Date.now()-started});console.log('PASS',name);}catch(e){results.push({name,status:'FAIL',error:String(e)});throw e;}}
(async()=>{
 await fs.mkdir(out,{recursive:true});profile=await fs.mkdtemp(path.join(os.tmpdir(),'cleancity-headless-'));
 let occupied=false;try{await fetch('http://127.0.0.1:9337/json');occupied=true;}catch{}
 if(occupied)throw Error('Debugging port 9337 is occupied; refusing to attach to any existing browser.');
 browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--disable-extensions','--no-first-run','--no-default-browser-check','--remote-debugging-port=9337',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
 browser.on('error',e=>console.error('Browser launch:',e.message));
 let targets;
 for(let i=0;i<40;i++){try{targets=await(await fetch('http://127.0.0.1:9337/json')).json();break;}catch{await delay(200);}}
 if(!targets)throw Error('Headless Chrome debugging endpoint unavailable');
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.method==='Page.javascriptDialogOpening'&&m.params.type==='beforeunload')call('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});};
 await call('Page.enable');await call('Runtime.enable');
 await call('Emulation.setDeviceMetricsOverride',{width:1536,height:816,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:base});
 for(let i=0;i<80;i++){if(await js(`!!document.querySelector('.operations-dashboard')`))break;await delay(100);}
 if(process.env.CLEANCITY_IOT_LIVE==='1'){
  await check('Actual COM8 observations reach the Physical Lab through the local proxy',async()=>{
   await click('Physical IoT Lab');await delay(1200);assert.match(await text(),/Receiver CONNECTED/);assert.match(await text(),/LOCAL PHYSICAL/);assert.equal(await js(`document.querySelectorAll('.bin-gauge').length`),4);
   const snapshot=await js(`fetch('/api/physical').then(r=>r.json())`);assert.equal(snapshot.receiver.port,'COM8');assert.ok(snapshot.bins.every(b=>b.receivedAt&&Date.now()-Date.parse(b.receivedAt)<10000));assert.ok(snapshot.bins.every(b=>b.history.length>0));await shot('iot-com8-live');
  });
 }else if(process.env.CLEANCITY_IOT==='1'){
  await check('Local physical proxy, four unknown channels and invalid calibration',async()=>{
   await click('Physical IoT Lab');await delay(1200);assert.match(await text(),/LOCAL PHYSICAL/);assert.match(await text(),/DISCONNECTED/);assert.equal(await js(`document.querySelectorAll('.bin-gauge').length`),4);assert.equal((await text()).match(/NO READING/g).length,4);assert.ok(!(await text()).includes('RECEIVING'));
   await fill('input[aria-label="BIN-001 empty distance"]','20');await fill('input[aria-label="BIN-001 usable depth"]','20');await click('Save BIN-001 calibration');await delay(300);assert.match(await text(),/Invalid calibration/);await shot('iot-local-desktop');
   await call('Emulation.setDeviceMetricsOverride',{width:390,height:816,deviceScaleFactor:1,mobile:true});assert.ok(await js('document.documentElement.scrollWidth<=innerWidth+1'));await shot('iot-local-mobile');
  });
 }else if(process.env.CLEANCITY_SEED==='1'){
  await check('One-click demand seed preserves configured city and replans',async()=>{
   await click('Cities');await click('View Briar Market Borough');await click('Save scenario');const before=(await library())[0];
   await click('Plan collection');await click('Next seed · new demand');await click('Save scenario');const after=(await library())[0];
   assert.equal(after.settings.seed,before.settings.seed+1);assert.deepEqual(after.roads,before.roads);assert.deepEqual(after.zones,before.zones);assert.deepEqual(after.trucks,before.trucks);assert.notDeepEqual(after.bins.map(b=>b.fillPercent),before.bins.map(b=>b.fillPercent));
   await shot('seed-controls');await click('Plan collection');await click('Review simulation');await click('Start collection');await click('Pause');await click('Finish run');assert.match(await text(),/Collection run finished/);
  });
 }else if(process.env.CLEANCITY_READY_MOBILE==='1'){
  const names=await js(`(async()=>{const {createReadyCities}=await import('/src/core/readyCities.ts');return createReadyCities().map(c=>c.name)})()`);
  for(let i=0;i<names.length;i++)await check(`Mobile ready city: ${names[i]}`,async()=>{
   await call('Emulation.setDeviceMetricsOverride',{width:1536,height:816,deviceScaleFactor:1,mobile:false});
   await click('Cities');await click(`View ${names[i]}`);if(await js(`!!document.querySelector('.modal')`))await click('Confirm');await click('Collection Simulator');await click('Optimize all zones');await click('Start collection');await click('Pause');
   await call('Emulation.setDeviceMetricsOverride',{width:390,height:816,deviceScaleFactor:1,mobile:true});await shot(`city-${i+1}-mobile-moving`);assert.ok(await js('document.documentElement.scrollWidth<=innerWidth+1'));await click('Finish run');await click('View collection analysis');await shot(`city-${i+1}-mobile-analytics`);assert.ok(await js('document.documentElement.scrollWidth<=innerWidth+1'));
  });
 }else if(process.env.CLEANCITY_F1B==='1'){
  await check('Seven-screen product journey and editable fleet',async()=>{
   await click('Cities');await click('View Aster Metropolitan');await click('City Studio');await click('Continue to dispatch');
   assert.match(await text(),/Ready the fleet/);const truck=await js(`document.querySelector('.fleet-editor b').innerText`);const editor=await js(`document.querySelector('.fleet-editor summary').innerText.replace(/\\s+/g,' ').trim()`);await click(editor);
   await fill('.fleet-editor input[name=capacity]','0');assert.equal(await js(`document.querySelector('.fleet-editor input[name=capacity]').checkValidity()`),false);await fill('.fleet-editor input[name=capacity]','6');await click(`Save ${truck}`);await click('Save scenario');assert.equal((await library())[0].trucks[0].capacityBinUnits,6);
   await click('Plan collection');assert.ok(await js(`!!document.querySelector('[aria-label="Dispatch review"]')`));await shot('f1b-dispatch');
   const route=await js(`document.querySelector('.route-vehicle summary').innerText.replace(/\\s+/g,' ').trim()`);await click(route);await click(`Inspect ${truck} on map`);assert.ok(await js(`!!document.querySelector('.inspector')`));
   await click('Review simulation');await click('Start collection');await click('Pause');await click('Resume');await click('Pause');await click('Step +1 min');if(process.env.CLEANCITY_READY==='1'){
 const actual=await js(`(async()=>{const {planCollection}=await import('/src/core/routing.ts');const {truckSnapshot}=await import('/src/core/simulation.ts');const c=JSON.parse(localStorage.getItem('cleancity.scenarios.v1'))[0];const p=planCollection(c);const time=document.querySelector('progress[aria-label="Overall simulation progress"]').value;return [...document.querySelectorAll('g.map-truck')].map(g=>{const s=truckSnapshot(c,p,time,g.dataset.truckId),a=c.nodes.find(n=>n.id===s.from),b=c.nodes.find(n=>n.id===s.to);const xy=g.getAttribute('transform').match(/translate\(([^,]+),([^\)]+)\)/).slice(1).map(Number);return {id:g.dataset.truckId,from:g.dataset.from,to:g.dataset.to,expectedFrom:s.from,expectedTo:s.to,error:Math.hypot(xy[0]-(a.x+(b.x-a.x)*s.fraction),xy[1]-(a.y+(b.y-a.y)*s.fraction))};});})()`);
 assert.ok(actual.length>0);for(const t of actual){assert.equal(t.from,t.expectedFrom);assert.equal(t.to,t.expectedTo);assert.ok(t.error<.001,'Truck marker must be exactly on its modeled road position');}
}await shot('f1b-simulation');await click('Finish run');await click('View collection analysis');
   assert.match(await text(),/Your collection, accounted for/);assert.match(await text(),/63.*completed|63/);assert.match(await text(),/summed vehicle hours/);await shot('f1b-analytics');
   await click('Open simulation');await click('Replay collection');await click('Pause');await click('Reset run');if(await js(`!!document.querySelector('.modal')`))await click('Confirm');
  });
  await check('Honest physical Lab without a receiver',async()=>{await click('Physical IoT Lab');await delay(300);assert.equal(await js(`document.querySelectorAll('.bin-gauge').length`),4);assert.equal(await js(`document.querySelectorAll('.bin-gauge .pill').length`),4);assert.match(await text(),/NO READING/);assert.doesNotMatch(await text(),/Supabase/);await shot('f1b-physical');});
  for(const width of [1536,768,390])await check(`F1B ${width}px layout and navigation`,async()=>{
   await call('Emulation.setDeviceMetricsOverride',{width,height:816,deviceScaleFactor:1,mobile:width===390});await delay(150);
   for(const [label,file] of [['Zone & Fleet Operations','dispatch'],['Collection Simulator','simulation'],['Analytics','analytics'],['Physical IoT Lab','physical']]){
    if(width===390)await click('Open navigation');await click(label);assert.ok(await js('document.documentElement.scrollWidth<=innerWidth+1'),`${label} page overflow`);await shot(`f1b-${file}-${width}`);
   }
  });
  await call('Emulation.setDeviceMetricsOverride',{width:1536,height:816,deviceScaleFactor:1,mobile:false});
  await check('No demand and unavailable fleet stay honest',async()=>{
   const fixture=(await library())[0];fixture.id='headless-no-demand';fixture.name='No demand fixture';fixture.bins.forEach(b=>b.fillPercent=0);await js(`localStorage.setItem('cleancity.scenarios.v1',${JSON.stringify(JSON.stringify([fixture]))})`);await call('Page.reload');await delay(500);await click('Zone & Fleet Operations');assert.match(await text(),/No bins currently meet/);await click('Plan collection');assert.match(await text(),/zero trips is the correct result/);
   fixture.bins[0].fillPercent=95;fixture.trucks.forEach(t=>t.available=false);await js(`localStorage.setItem('cleancity.scenarios.v1',${JSON.stringify(JSON.stringify([fixture]))})`);await call('Page.reload');await delay(500);await click('Zone & Fleet Operations');assert.match(await text(),/No trucks are available/);
   fixture.trucks.forEach(t=>t.available=true);fixture.roads=[];await js(`localStorage.setItem('cleancity.scenarios.v1',${JSON.stringify(JSON.stringify([fixture]))})`);await call('Page.reload');await delay(500);await click('Zone & Fleet Operations');await click('Plan collection');assert.ok(await js(`!!document.querySelector('.operation-exceptions')`));
  });
 }else if(process.env.CLEANCITY_SIX_CITIES==='1'||process.env.CLEANCITY_READY==='1'){
  const stats=await js(`(async()=>{const {createCuratedCities}=await import('/src/core/curated.ts');const {createReadyCities}=await import('/src/core/readyCities.ts');const {planCollection}=await import('/src/core/routing.ts');return ${process.env.CLEANCITY_READY==='1'?'createReadyCities()':'createCuratedCities()'}.map(c=>{const p=planCollection(c);return {name:c.name,nodes:c.nodes.length,roads:c.roads.length,bins:c.bins.length,zones:c.zones.length,heads:c.nodes.filter(n=>n.type==='HEAD').length,trucks:c.trucks.length,eligible:p.eligible.length,pending:p.pending,distance:p.distance,duration:p.duration,cost:p.cost};});})()`);
  for(let i=0;i<stats.length;i++)await check(`Complete map journey: ${stats[i].name}`,async()=>{
   const s=stats[i];await click('Cities');if(process.env.CLEANCITY_READY!=='1')await click('Templates 6');await click(`View ${s.name}`);if(await js(`!!document.querySelector('.modal')`))await click('Confirm');await click('City Studio');
   await shot(`city-${i+1}-desktop`);
   await click('Places');await fill('.inspector input','depot');const headChoice=await js(`document.querySelector('.studio-object-list button').innerText.replace(/\\s+/g,' ').trim()`);await click(headChoice);assert.equal(await js(`document.querySelector('.inspector select[name=type]').value`),'HEAD');await click('Close inspector');
   // Actual direct-form creation, property editing, deletion and recovery per map.
   await click('+ Bin');await fill('.studio-create-form input[name=name]','QA temporary bin');await submit('.studio-create-form');await fill('.inspector input[name=name]','QA renamed bin');await click('Save changes');await click('Delete bin');await click('Confirm');await click('Undo edit');await click('Undo edit');await click('Undo edit');
   await click('+ Junction');await fill('.studio-create-form input[name=name]','QA place');await submit('.studio-create-form');await fill('.inspector input[name=label]','QA edited place');await click('Save changes');await click('Undo edit');await click('Undo edit');
   for(const label of ['QA road start','QA road end']){await click('+ Junction');await fill('.studio-create-form input[name=name]',label);await submit('.studio-create-form');}
   await click('+ Road');await fill('.studio-create-form input[name=name]','QA new road');
   const last=await js(`Array.from(document.querySelectorAll('.studio-create-form select[name=from] option')).slice(-2).map(o=>o.value)`);
   await fill('.studio-create-form select[name=from]',last[0]);await fill('.studio-create-form select[name=to]',last[1]);await submit('.studio-create-form');await click('Delete road');await click('Confirm');for(let u=0;u<4;u++)await click('Undo edit');
   await click('Save scenario');const saved=(await library())[0];assert.equal(saved.bins.length,s.bins);assert.equal(saved.nodes.length,s.nodes);assert.equal(saved.roads.length,s.roads);assert.equal(saved.zones.length,s.zones);
   // Select a road through the actual map, inspect and update its name, then undo.
   const roadLabel=await js(`document.querySelector('svg [aria-label^="Road "]')?.getAttribute('aria-label')`);if(!roadLabel)throw Error('No inspectable road');await click(roadLabel);await fill('.inspector input[name=name]','QA road');await click('Save changes');await click('Undo edit');
   await click('Save scenario');
   await click('Cities');await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out});const archive=path.join(out,s.name.replace(/[^a-z0-9]/gi,'-')+'.json');await fs.rm(archive,{force:true});await click('Export current city');
   for(let n=0;n<30;n++){try{await fs.access(archive);break;}catch{await delay(100);}}
   assert.equal(JSON.parse(await fs.readFile(archive,'utf8')).bins.length,s.bins);
   const d=await call('DOM.getDocument');const f=await call('DOM.querySelector',{nodeId:d.root.nodeId,selector:'.cities-workspace input[type=file]'});await call('DOM.setFileInputFiles',{nodeId:f.nodeId,files:[archive]});await delay(200);if(await js(`!!document.querySelector('.modal')`))await click('Confirm');for(let wait=0;wait<40;wait++){if(await js(`!!document.querySelector('.studio-workspace')`))break;await delay(100);}await click('Save scenario');
   await call('Page.reload');for(let wait=0;wait<300;wait++){if((await text()).includes(s.name))break;await delay(100);}assert.match(await text(),new RegExp(s.name));
   await click('Zone & Fleet Operations');await click('Generate zones');const zoneChoice=await js(`document.querySelector('.zone-card').innerText.replace(/\\s+/g,' ').trim()`);await click(zoneChoice);assert.ok(await js(`!!document.querySelector('.inspector input[name=name]')`));await click('Plan collection');await click('Collection Simulator');await click('Start collection');await click('Pause');await click('Step +1 min');if(process.env.CLEANCITY_READY==='1'){
 const actual=await js(`(async()=>{const {planCollection}=await import('/src/core/routing.ts');const {truckSnapshot}=await import('/src/core/simulation.ts');const c=JSON.parse(localStorage.getItem('cleancity.scenarios.v1'))[0];const p=planCollection(c);const time=document.querySelector('progress[aria-label="Overall simulation progress"]').value;return [...document.querySelectorAll('g.map-truck')].map(g=>{const s=truckSnapshot(c,p,time,g.dataset.truckId),a=c.nodes.find(n=>n.id===s.from),b=c.nodes.find(n=>n.id===s.to);const xy=g.getAttribute('transform').match(/translate\(([^,]+),([^\)]+)\)/).slice(1).map(Number);return {id:g.dataset.truckId,from:g.dataset.from,to:g.dataset.to,expectedFrom:s.from,expectedTo:s.to,error:Math.hypot(xy[0]-(a.x+(b.x-a.x)*s.fraction),xy[1]-(a.y+(b.y-a.y)*s.fraction))};});})()`);
 assert.ok(actual.length>0);for(const t of actual){assert.equal(t.from,t.expectedFrom);assert.equal(t.to,t.expectedTo);assert.ok(t.error<.001,'Truck marker must be exactly on its modeled road position');}
}await shot(`city-${i+1}-moving`);await click('Finish run');assert.match(await text(),/Collection run finished/);assert.ok((await text()).includes(`${s.eligible-s.pending.length} completed stops`));
   await shot(`city-${i+1}-complete`);await click('Analytics');assert.match(await text(),/Collection analytics/);assert.ok((await text()).includes(s.distance.toFixed(2)), 'Analytics planned distance agrees with original input plan');await shot(`city-${i+1}-analytics`);
   if(i===2||i===5||process.env.CLEANCITY_READY==='1'){await call('Emulation.setDeviceMetricsOverride',{width:390,height:816,deviceScaleFactor:1,mobile:true});await click('Open navigation');await click('Dashboard');await shot(`city-${i+1}-mobile`);assert.ok(await js('document.documentElement.scrollWidth<=innerWidth+1'));await call('Emulation.setDeviceMetricsOverride',{width:1536,height:816,deviceScaleFactor:1,mobile:false});}
  });
  await fs.writeFile(path.join(out,'six-city-metrics.json'),JSON.stringify(stats,null,2));
 }else{
 await check('Dashboard initial state, alerts and real map',async()=>{assert.match(await text(),/Municipal operations/);assert.ok(await js(`document.querySelectorAll('.map-bin').length>0 || document.querySelectorAll('svg [role="button"]').length>0`));await shot('dashboard-desktop');});
 await check('Curated library and independent template',async()=>{await click('Cities');assert.equal(await js(`document.querySelectorAll('.city-library-card').length`),6);await shot('cities-desktop');await click('View Willowbridge Riverside');assert.match(await text(),/Willowbridge Riverside/);await click('Save scenario');assert.equal((await library())[0].bins.length,32);});
 await check('Empty city, direct asset CRUD and reload',async()=>{
  await click('Cities');await click('Create city');await fill('.create-city-panel input[name=name]','Browser Acceptance');await fill('.create-city-panel select[name=bins]','0');await submit('.create-city-panel form');
  for(const name of ['Library','Station']){await click('+ Junction');await fill('.studio-create-form input[name=name]',name);await submit('.studio-create-form');}
  await click('+ Road');await fill('.studio-create-form input[name=name]','Station Road');await submit('.studio-create-form');
  await click('+ Bin');await fill('.studio-create-form input[name=name]','Library bin');await submit('.studio-create-form');
  await click('Save scenario');const c=(await library())[0];assert.equal(c.nodes.length,2);assert.equal(c.roads.length,2);assert.equal(c.bins.length,1);
  await call('Page.reload');await delay(700);assert.match(await text(),/Browser Acceptance/);await click('City Studio');await shot('studio-desktop');
 });
 await check('Bin edit, deletion and undo/redo',async()=>{
  await click('Library bin 0% full');await fill('.inspector input[name=name]','Edited library bin');await click('Save changes');await click('Save scenario');assert.equal((await library())[0].bins[0].name,'Edited library bin');
  await click('Delete bin');await click('Confirm');await click('Undo edit');await click('Save scenario');assert.equal((await library())[0].bins.length,1);await click('Redo edit');await click('Undo edit');
 });
 await check('Save & open preserves draft and other cities',async()=>{
  await click('+ Junction');await fill('.studio-create-form input[name=name]','Draft Square');await submit('.studio-create-form');await click('Cities');await click('View Meadowbrook Gardens');await click('Save & open');
  const saved=await library();assert.ok(saved.some(c=>c.nodes.some(n=>n.label==='Draft Square')));assert.ok(saved.some(c=>c.name==='Willowbridge Riverside'));
 });
 for(const width of [768,390])await check(`Responsive ${width}px navigation/dialog/layout`,async()=>{
  await call('Emulation.setDeviceMetricsOverride',{width,height:816,deviceScaleFactor:1,mobile:width===390});await delay(150);
  if(width===390){await click('Open navigation');await click('Cities');}else await click('Cities');
  assert.ok(await js('document.documentElement.scrollWidth <= innerWidth+1'),'page horizontal overflow');
  await shot(`cities-${width}`);await click('Create city');assert.ok(await js(`!!document.querySelector('[role=dialog] input:focus')`));await shot(`create-${width}`);await click('Cancel');
 });
 await call('Emulation.setDeviceMetricsOverride',{width:1536,height:816,deviceScaleFactor:1,mobile:false});
 await check('Downstream demo plan, playback and Analytics',async()=>{
  await click('City Studio');await click('Open guided demo');if(await js(`!!document.querySelector('.modal')`))await click('Confirm');
  await click('Start simulation');await click('Pause');await click('Step +1 min');await click('Finish run');assert.match(await text(),/Collection run finished/);await click('Analytics');assert.match(await text(),/Collection analytics/);
 });
 await check('100-bin city map, selection and reload',async()=>{
  await click('Cities');await click('View Aster Metropolitan');await click('Confirm');await click('Save scenario');assert.equal((await library())[0].bins.length,100);await click('City Studio');await click('Fit city');await click('Zoom in');await click('Zoom out');await shot('studio-100');
 });
 await check('Actual JSON download and valid/invalid file imports',async()=>{
  const exported=path.join(out,'Aster-Metropolitan.json');
  await fs.rm(exported,{force:true});
  await click('Cities');await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out});await click('Export current city');
  for(let i=0;i<30;i++){try{await fs.access(exported);break;}catch{await delay(100);}}
  assert.equal(JSON.parse(await fs.readFile(exported,'utf8')).bins.length,100);
  const before=(await library()).length;
  const setFile=async file=>{const d=await call('DOM.getDocument');const n=await call('DOM.querySelector',{nodeId:d.root.nodeId,selector:'.cities-workspace input[type=file]'});await call('DOM.setFileInputFiles',{nodeId:n.nodeId,files:[file]});await delay(200);};
  const invalid=path.join(out,'invalid-import.json');await fs.writeFile(invalid,'{');await setFile(invalid);assert.equal((await library()).length,before);assert.ok(await js(`!!document.querySelector('[role=alert]')`));
  await setFile(exported);await click('Save scenario');assert.equal((await library()).length,before+1);assert.equal((await library())[0].bins.length,100);
 });
 await check('Corrupt storage remains untouched on save',async()=>{
  await js(`localStorage.setItem('cleancity.scenarios.v1','broken')`);await call('Page.reload');await delay(600);await click('Save scenario');assert.equal(await js(`localStorage.getItem('cleancity.scenarios.v1')`),'broken');assert.match(await text(),/unreadable/);
 });
 }
 assert.equal(errors.length,0,'Uncaught application exceptions');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
 await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'results.json'),JSON.stringify({engine:'Installed Chrome headless via CDP',base,results,errors},null,2));
 if(socket){try{await call('Browser.close');}catch{}socket.close();}if(browser)browser.kill();
 if(profile && path.resolve(profile).startsWith(path.resolve(os.tmpdir())+path.sep+'cleancity-headless-')){try{await fs.rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{}}
});
