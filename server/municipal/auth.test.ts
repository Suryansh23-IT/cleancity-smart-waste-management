import {it,expect} from 'vitest';
import {passwordHash,validHash,verifyPassword} from './auth';
import {createMunicipalApp} from './app';
import {TestStore} from './testStore';
it('isolates short local-demo hashes from public/production authentication',async()=>{
 const password='demo-only',hash=await passwordHash(password,true);
 expect(await verifyPassword(password,hash)).toBe(true);expect(await verifyPassword('incorrect',hash)).toBe(false);
 expect(validHash(hash)).toBe(false);expect(validHash(hash,true)).toBe(true);
 await expect(passwordHash(password)).rejects.toThrow(/12/);
 const config={origin:'http://127.0.0.1:5182',username:'test',passwordHash:hash,workspaceId:'test',secureCookies:false};
 expect(()=>createMunicipalApp(new TestStore(),config)).not.toThrow();
 expect(()=>createMunicipalApp(new TestStore(),{...config,origin:'https://demo.example',secureCookies:true})).toThrow(/strong password/);
 expect(()=>createMunicipalApp(new TestStore(),{...config,origin:'https://demo.example'})).toThrow(/strong password/);
 const strong=await passwordHash('longer-test-password');expect(validHash(strong)).toBe(true);
});
