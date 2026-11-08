import {createMunicipalApp} from './app';
import {mongoStore} from './store';
import {telemetryConfig} from './cloudTelemetry';
const env=process.env;
const store=mongoStore(env.MONGODB_URI??'',env.MONGODB_DATABASE??'');
const app=createMunicipalApp(store,{origin:env.APP_ORIGIN??'http://127.0.0.1:5182',username:env.OPERATOR_USERNAME??'operator',passwordHash:env.OPERATOR_PASSWORD_HASH??'',workspaceId:env.WORKSPACE_ID??'municipal',secureCookies:env.NODE_ENV==='production',telemetry:telemetryConfig(env)});
const port=Number(env.MUNICIPAL_PORT??3001);if(!Number.isSafeInteger(port)||port<1024||port>65535)throw Error('Invalid municipal port');
const server=app.listen(port,'127.0.0.1',()=>console.log(`Municipal API listening on loopback port ${port}; database readiness requires /api/ready`));
async function stop(){server.close(async()=>{await store.close();process.exit(0);});}
process.once('SIGINT',stop);process.once('SIGTERM',stop);
