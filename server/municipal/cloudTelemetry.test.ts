import { createServer } from 'node:http';
import { expect, it } from 'vitest';
import { createMunicipalApp } from './app';
import { hashToken, passwordHash } from './auth';
import { buildBatch, cloudSnapshot, telemetryConfig, type TelemetryBatch } from './cloudTelemetry';
import { TestStore } from './testStore';
import { captureSnapshot, previewReadings, showcaseCity } from '../../src/core/showcase';
import { physicalChannels } from '../../src/core/physical';
import { planCollection } from '../../src/core/routing';
import { advance, startSimulation } from '../../src/core/simulation';

const token = 'fixture-device-token-with-32-characters';
const calibration = Object.fromEntries(physicalChannels.map(id => [id, {emptyDistanceCm: 16, usableDepthCm: 12}]));
const config = telemetryConfig({
  CLOUD_DEVICE_ID: 'device-test-showcase', CLOUD_DEVICE_TOKEN_HASH: hashToken(token),
  CLOUD_DEVICE_CALIBRATION: JSON.stringify(calibration),
})!;
const payload = (now = Date.now()) => ({
  deviceId: config.deviceId, bootId: 'a'.repeat(32), seq: 1, sampledAtMs: now,
  readings: physicalChannels.map(binId => ({binId, pulseUs: 300, beforeHigh: false, afterHigh: false})),
});

it('enforces bounded fresh four-channel diagnostics and preserves frozen TEST provenance', () => {
  const now = Date.now(), input = payload(now);
  expect(() => buildBatch({...input, sampledAtMs: now - 120001}, 'w', config, now)).toThrow();
  expect(() => buildBatch({...input, readings: Array(4).fill(input.readings[0])}, 'w', config, now)).toThrow();
  expect(() => buildBatch({...input, readings: input.readings.map(r=>({...r, pulseUs: 30001}))}, 'w', config, now)).toThrow();
  const batch = buildBatch(input, 'w', config, now);
  expect(buildBatch({...input, readings: [...input.readings].reverse()}, 'w', config, now + 8000).payloadHash).toBe(batch.payloadHash);
  const snapshot = cloudSnapshot([batch], config);
  expect(snapshot.bins).toHaveLength(4);
  expect(() => previewReadings(snapshot, now + 45001)).toThrow(/fresh/);
  expect(() => captureSnapshot(showcaseCity(), snapshot, 'PHYSICAL', now)).toThrow(/TEST/);
  const city = captureSnapshot(showcaseCity(), snapshot, 'TEST', now), plan = planCollection(city);
  expect(city.showcaseSnapshot?.origin).toBe('CLOUD_TEST');
  expect(advance(city, startSimulation(city, plan), plan.duration).simulation.completed.sort()).toEqual([...physicalChannels]);
  expect(cloudSnapshot([buildBatch({...input, readings: input.readings.map((row,i) => i===0 ? {...row,pulseUs:0} : i===1 ? {...row,beforeHigh:true} : row)}, 'w', config, now)],config).bins.map(row => row.status))
    .toEqual(['NO_ECHO','INVALID','VALID','VALID']);
});

it('separates device ingestion from operator reads and handles retry, rate limits and store recovery', async () => {
  const origin = 'http://127.0.0.1:5182', password = 'fixture-operator-password';
  const store = new TestStore();
  const rows = new Map<string, TelemetryBatch>();
  const backend = Object.assign(store, {telemetry: {
    async save(batch: TelemetryBatch) {
      if (!store.available) throw Error('Fixture storage down');
      const prior = rows.get(batch._id);
      if (prior) return prior.payloadHash === batch.payloadHash ? 'duplicate' as const : 'conflict' as const;
      if ([...rows.values()].some(row=>row.slot === batch.slot)) return 'limited' as const;
      rows.set(batch._id,batch);
      return 'stored' as const;
    },
    async recent(workspace: string, device: string, test: boolean) {
      return [...rows.values()].filter(row=>row.workspaceId===workspace && row.deviceId===device && row.test===test);
    },
  }});
  const server = createServer(createMunicipalApp(backend, {
    origin, username:'operator', passwordHash:await passwordHash(password), workspaceId:'fixture-workspace',
    secureCookies:false, telemetry:config,
  })).listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  const base = 'http://127.0.0.1:'+(server.address() as {port:number}).port+'/api';
  const ingest = (body: string, credential = token) => fetch(base+'/telemetry/ingest', {
    method:'POST',headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json'},body,
  });
  try {
    const input = payload(), body = JSON.stringify(input);
    expect((await ingest(body,'invalid')).status).toBe(401);
    expect((await ingest('x'.repeat(8193))).status).toBe(413);
    expect((await ingest(JSON.stringify({...input,deviceId:'device-other'}))).status).toBe(422);
    expect((await fetch(base+'/telemetry/snapshot')).status).toBe(401);
    expect((await ingest(body)).status).toBe(201);
    expect((await ingest(body)).status).toBe(200);
    expect((await ingest(JSON.stringify({...input,sampledAtMs:input.sampledAtMs-1000}))).status).toBe(409);
    // Keep the fixture rate bucket on the same window even on a slow CI runner.
    for (const row of rows.values()) row.slot=Math.floor(Date.now()/5000);
    expect((await ingest(JSON.stringify({...input,seq:2}))).status).toBe(429);
    store.available=false;
    expect((await ingest(body)).status).toBe(503);
    store.available=true;
    expect((await ingest(body)).status).toBe(200);
    const login = await fetch(base+'/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'operator',password})});
    expect(login.status).toBe(200);
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    const response = await fetch(base+'/telemetry/snapshot',{headers:{Cookie:cookie}});
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const snapshot = await response.json();
    expect(snapshot.origin).toBe('CLOUD_TEST');
    expect(snapshot.bins.map((row:{history:unknown[]})=>row.history.length)).toEqual([1,1,1,1]);
    expect(rows.size).toBe(1);
  } finally {
    await new Promise<void>(resolve=>server.close(()=>resolve()));
  }
});
