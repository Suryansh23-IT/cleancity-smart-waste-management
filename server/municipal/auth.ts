import {createHash,randomBytes,scrypt as derive,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(derive);
export const hashToken=(value:string)=>createHash('sha256').update(value).digest('hex');
export const token=()=>randomBytes(32).toString('hex');
export async function passwordHash(password:string,localDemo=false){if(password.length<(localDemo?8:12)||password.length>256)throw Error(localDemo?'Use an 8–256 character local demo password':'Use a 12–256 character password');const salt=token();const key=await scrypt(password,salt,64) as Buffer;return `${password.length<12?'scrypt-local':'scrypt'}:${salt}:${key.toString('hex')}`;}
export async function verifyPassword(password:unknown,encoded:string){if(typeof password!=='string'||password.length>256)return false;const [,salt,hex]=encoded.split(':');const key=await scrypt(password,salt,64) as Buffer;const expected=Buffer.from(hex,'hex');return expected.length===key.length&&timingSafeEqual(key,expected);}
export const validHash=(value:string,allowLocalDemo=false)=>/^scrypt:[a-f0-9]{64}:[a-f0-9]{128}$/.test(value)||(allowLocalDemo&&/^scrypt-local:[a-f0-9]{64}:[a-f0-9]{128}$/.test(value));
