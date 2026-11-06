import {SerialManager} from './manager.ts';
import {SerialPort} from 'serialport';
import {resolve} from 'node:path';
import {PhysicalStore} from './store.ts';
import {LocalPhysical} from './service.ts';
import {SerialReceiver} from './serial.ts';
import {localApi} from './http.ts';
const args=process.argv.slice(2);
if(args.includes('--list')){console.log(await SerialPort.list());}else{
 const portIndex=args.indexOf('--port'),portPath=portIndex>=0?args[portIndex+1]:null;
 if(portIndex>=0&&(!portPath||!/^COM\d+$/i.test(portPath)))throw Error('Specify --port COM<number>; no device was opened');
 const dbPath=resolve('.local/physical-demo.sqlite');const service=new LocalPhysical(new PhysicalStore(dbPath));
 const list=async()=>(await SerialPort.list()).filter(p=>/^COM\d+$/i.test(p.path)).map(p=>({path:p.path,label:p.friendlyName??p.manufacturer??p.path}));
 const controls=new SerialManager(list,path=>{
  let active:SerialPort|undefined;let opened:Promise<void>=Promise.resolve();
  const receiver=new SerialReceiver(service,path,p=>{const port=new SerialPort({path:p,baudRate:115200,autoOpen:false,rtscts:false,highWaterMark:1024});active=port;const open=port.open.bind(port);port.open=(callback)=>{opened=new Promise(resolve=>{open(error=>{resolve();callback?.(error);});});};return port;});receiver.start();
  return {stop:async()=>{receiver.stop();await opened;const port=active;if(port?.isOpen||port?.closing)await new Promise<void>((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Port is still closing; retry disconnect')),3000);port.once('close',()=>{clearTimeout(timeout);resolve();});if(!port.closing)port.close(error=>{if(error){clearTimeout(timeout);reject(error);}});});service.port=null;}};
 });
 const connect=controls.connect,disconnect=controls.disconnect;
 const server=localApi(service,controls);server.listen(8787,'127.0.0.1',()=>{console.log('Local Physical API: http://127.0.0.1:8787/api/physical · Use Detect ports / Connect in the Lab');if(portPath)connect(portPath).catch(e=>{service.error=e.message;console.error(e.message);});});
 const flush=setInterval(()=>service.flush(),1000);
 const stop=async()=>{clearInterval(flush);await disconnect();service.flush();server.close(()=>{service.store.close();process.exit(process.exitCode??0);});};process.on('SIGINT',stop);process.on('SIGTERM',stop);
 server.on('error',e=>{console.error(e.message);process.exitCode=1;stop();});
}
