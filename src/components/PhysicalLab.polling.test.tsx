// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import PhysicalLab from './PhysicalLab';

(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('pauses polling in a hidden tab and refreshes on return',async()=>{
 vi.useFakeTimers();let state:DocumentVisibilityState='visible';
 vi.spyOn(document,'visibilityState','get').mockImplementation(()=>state);
 const fetcher=vi.fn().mockResolvedValue({ok:true,headers:new Headers({'content-type':'application/json'}),json:async()=>({origin:'CLOUD_WIFI',bins:[]})});vi.stubGlobal('fetch',fetcher);
 const el=document.createElement('div'),root=createRoot(el);
 try{
  await act(async()=>root.render(<PhysicalLab transport="wifi" onTransport={()=>{}} onSignIn={()=>{}} onDemo={()=>{}}/>));
  expect(fetcher).toHaveBeenCalledTimes(1);
  state='hidden';await act(async()=>{document.dispatchEvent(new Event('visibilitychange'));await vi.advanceTimersByTimeAsync(15000);});
  expect(fetcher).toHaveBeenCalledTimes(1);
  state='visible';await act(async()=>{document.dispatchEvent(new Event('visibilitychange'));});
  expect(fetcher).toHaveBeenCalledTimes(2);
 }finally{await act(async()=>root.unmount());}
});
