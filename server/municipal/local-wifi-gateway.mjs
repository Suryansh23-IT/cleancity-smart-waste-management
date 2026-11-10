import {createServer as createHttpsServer} from 'node:https';
import {request as httpRequest} from 'node:http';
import {readFileSync} from 'node:fs';
import {isIP} from 'node:net';

// The municipal API remains on loopback; only device ingestion is exposed on LAN.
const address = process.env.CLEANCITY_LAN_IP;
const port = Number(process.env.CLEANCITY_LAN_PORT ?? 3443);
if (isIP(address ?? '') !== 4 || !Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Set a valid CLEANCITY_LAN_IP and port');
const server = createHttpsServer({key:readFileSync('.local/wifi/server.key'), cert:readFileSync('.local/wifi/server.crt'), minVersion:'TLSv1.2', handshakeTimeout:10000}, (req,res) => {
  if (req.method !== 'POST' || req.url !== '/api/telemetry/ingest') {res.writeHead(404);res.end();return;}
  const length = Number(req.headers['content-length']);
  if (!Number.isFinite(length) || length < 1 || length > 8192 || req.headers['transfer-encoding']) {res.writeHead(413);res.end();return;}
  const upstream = httpRequest({host:'127.0.0.1',port:3001,path:'/api/telemetry/ingest',method:'POST',headers:{'content-type':req.headers['content-type'] ?? '', 'content-length':String(length), authorization:req.headers.authorization ?? ''},timeout:10000}, response=>{res.writeHead(response.statusCode ?? 502, {'content-type':'application/json','cache-control':'no-store'});response.pipe(res);});
  upstream.on('timeout',()=>upstream.destroy());
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503);res.end();});
  req.on('error',()=>upstream.destroy());
  req.pipe(upstream);
});
server.maxConnections=32;server.headersTimeout=10000;server.requestTimeout=15000;
server.listen(port,address,()=>console.log(`Local Wi-Fi HTTPS ingest listening on ${address}:${port}`));
