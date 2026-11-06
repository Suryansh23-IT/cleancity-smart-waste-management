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
 const server=localApi(service);server.listen(8787,'127.0.0.1',()=>console.log(`Local Physical API: http://127.0.0.1:8787/api/physical · SQLite: ${dbPath}\n${portPath?'Explicit serial access requested: '+portPath:'No COM port opened. Waiting for separately authorized --port selection.'}`));
 const receiver=portPath?new SerialReceiver(service,portPath,path=>new SerialPort({path,baudRate:115200,autoOpen:false,rtscts:false,highWaterMark:1024})):null;
 const flush=setInterval(()=>service.flush(),1000);receiver?.start();
 const stop=()=>{clearInterval(flush);receiver?.stop();service.flush();server.close(()=>{service.store.close();process.exit(process.exitCode??0);});};process.on('SIGINT',stop);process.on('SIGTERM',stop);
 server.on('error',e=>{console.error(e.message);process.exitCode=1;stop();});
}
