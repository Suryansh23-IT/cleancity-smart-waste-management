import {createServer} from 'node:http';
import {hostedHandler} from './hosted.js';

// Render terminates TLS before forwarding traffic to this listener.
const port=Number(process.env.PORT ?? 10000);
if(!Number.isSafeInteger(port)||port<1024||port>65535||[18012,18013,19099].includes(port))throw Error('Invalid Render PORT');
const handle=hostedHandler(process.env);
const server=createServer((req,res)=>{
 if(req.method==='GET' && req.url==='/api/health'){
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify({data:{status:'running'},meta:{service:'municipal',databaseVerified:false}}));
  return;
 }
 handle(req,res);
});
server.listen(port,'0.0.0.0',()=>console.log(`Municipal API listener ready on port ${port}`));
process.once('SIGTERM',()=>server.close(()=>process.exit(0)));
