import {afterEach, expect, it, vi} from 'vitest';
import {waitForBackend} from './DatabaseWorkspace';

afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('retries readiness without submitting credentials and reports progress',async()=>{
 vi.useFakeTimers();
 const fetcher=vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ok:true});
 vi.stubGlobal('fetch',fetcher);const messages:string[]=[];
 const pending=waitForBackend(message=>messages.push(message));
 await vi.advanceTimersByTimeAsync(2000);await pending;
 expect(fetcher).toHaveBeenCalledTimes(2);
 expect(fetcher.mock.calls.every(call=>call[0]==='/api/ready' && !call[1].method)).toBe(true);
 expect(messages[1]).toContain('Retrying');
});
it('stops after three unsuccessful checks with an actionable error',async()=>{
 vi.useFakeTimers();const fetcher=vi.fn().mockResolvedValue({ok:false});vi.stubGlobal('fetch',fetcher);
 const pending=waitForBackend(()=>{});const assertion=expect(pending).rejects.toThrow('Please try again');
 await vi.runAllTimersAsync();await assertion;expect(fetcher).toHaveBeenCalledTimes(3);
});
