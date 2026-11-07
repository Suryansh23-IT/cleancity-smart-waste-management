import {passwordHash} from '../server/municipal/auth';
// Pipe a password over stdin; never pass it on the command line or commit it.
let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>1024)throw Error('Input too long');}
console.log(await passwordHash(input.replace(/\r?\n$/,''),process.argv.includes('--local-demo')));
