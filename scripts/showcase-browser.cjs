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
 await call('Page.addScriptToEvaluateOnNewDocument',{source: "const originalFetch=window.fetch;window.fetch=(input,init)=>String(input).includes('/api/physical')?Promise.resolve(new Response(JSON.stringify({error:'TEST offline receiver'}),{status:503,headers:{'Content-Type':'application/json'}})):originalFetch(input,init);"});
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
 }else
 await check('Ten-bin TEST snapshot to dispatch, playback, analytics and persistence',async()=>{
 await click('Physical IoT Lab');await click('Open 10-bin showcase');if(await js('!!document.querySelector(".modal")'))await click('Confirm');
 assert.match(await text(),/capture required/);await click('Preview actual sensors');await delay(700);assert.match(await text(),/unavailable|disconnected/);
 await click('Preview TEST fixtures');assert.match(await text(),/NOT LIVE/);await click('Confirm TEST snapshot');assert.match(await text(),/TEST FIXTURE PLANNING SNAPSHOT/);
 await click('Save showcase city');const saved=await library();assert.equal(saved[0].bins.length,10);assert.equal(saved[0].zones.length,1);assert.equal(saved[0].trucks.length,1);assert.equal(saved[0].nodes.filter(n=>n.type==='HEAD').length,1);assert.equal(saved[0].showcaseSnapshot.mode,'TEST');assert.equal(saved[0].bins.filter(b=>b.name.startsWith('VIRTUAL')).length,6);await shot('showcase-dashboard');
 await click('City Studio');await js('document.querySelector("#city-map").scrollIntoView()');const mapShot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'showcase-map-detail.png'),Buffer.from(mapShot.data,'base64'));await shot('showcase-map');await click('Zone & Fleet Operations');await click('Plan collection');await shot('showcase-dispatch');
 await click('Review simulation');await click('Start collection');await delay(1500);await click('Pause');await click('Physical IoT Lab');assert.equal(await js('document.querySelector(".showcase-panel fieldset").disabled'),true);await click('Collection Simulator');await js('document.querySelector("#city-map").scrollIntoView()');const simShot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'showcase-simulation-detail.png'),Buffer.from(simShot.data,'base64'));await shot('showcase-simulation');
 await click('Finish run');await click('View collection analysis');assert.match(await text(),/4/);await js('document.querySelector(".operation-summary").scrollIntoView({block:"center"})');const resultShot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'showcase-analytics-detail.png'),Buffer.from(resultShot.data,'base64'));await shot('showcase-analytics');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await shot('showcase-mobile');assert.equal(await js('document.documentElement.scrollWidth<=window.innerWidth'),true);
 await call('Page.reload');await delay(1200);assert.match(await text(),/TEST FIXTURE/);assert.equal((await library())[0].showcaseSnapshot.mode,'TEST');
 });
 assert.equal(errors.length,0,'Uncaught application exceptions');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
 await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'results.json'),JSON.stringify({engine:'Installed Chrome headless via CDP',base,results,errors},null,2));
 if(socket){try{await call('Browser.close');}catch{}socket.close();}if(browser)browser.kill();
 if(profile && path.resolve(profile).startsWith(path.resolve(os.tmpdir())+path.sep+'cleancity-headless-')){try{await fs.rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{}}
});
