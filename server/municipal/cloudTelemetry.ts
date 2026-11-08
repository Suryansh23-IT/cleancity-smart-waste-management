import { hashToken } from './auth';
import { diagnosticObservation } from '../local/parser';
import { fillFromDistance, tokenMatches } from '../telemetry';
import { physicalChannels, cloudStaleMs } from '../../src/core/physical';
import type { PhysicalBin } from '../../src/core/physical';

type Calibration = NonNullable<PhysicalBin['calibration']>;
export interface TelemetryConfig {
  deviceId: string;
  tokenHash: string;
  test: boolean;
  calibration: Partial<Record<string, Calibration>>;
}
export interface TelemetryBatch {
  _id: string;
  workspaceId: string;
  deviceId: string;
  test: boolean;
  slot: number;
  payloadHash: string;
  receivedAt: Date;
  sampledAt: Date;
  expiresAt: Date;
  bins: PhysicalBin[];
}
export type WriteResult = 'stored' | 'duplicate' | 'conflict' | 'limited';
export interface TelemetryStore {
  save(batch: TelemetryBatch): Promise<WriteResult>;
  recent(workspaceId: string, deviceId: string, test: boolean): Promise<TelemetryBatch[]>;
}

export function telemetryConfig(env: NodeJS.ProcessEnv): TelemetryConfig | undefined {
  const { CLOUD_DEVICE_ID: deviceId, CLOUD_DEVICE_TOKEN_HASH: tokenHash, CLOUD_DEVICE_CALIBRATION: raw } = env;
  if (!deviceId && !tokenHash && !raw) return undefined;
  if (!deviceId || !/^device-[a-z0-9-]{1,48}$/.test(deviceId) || !tokenHash || !/^[a-f0-9]{64}$/.test(tokenHash))
    throw Error('Configure a cloud device ID and SHA-256 token hash');
  const parsed: unknown = raw ? JSON.parse(raw) : {};
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw Error('Cloud calibration must be an object keyed by sensor ID');
  const calibration: TelemetryConfig['calibration'] = {};
  for (const [id, value] of Object.entries(parsed)) {
    const c = value as Calibration;
    if (!physicalChannels.some(channel => channel === id) || !c || !Number.isFinite(c.emptyDistanceCm) || !Number.isFinite(c.usableDepthCm))
      throw Error('Invalid cloud sensor calibration');
    fillFromDistance(2, c.emptyDistanceCm, c.emptyDistanceCm - c.usableDepthCm);
    calibration[id] = { emptyDistanceCm: c.emptyDistanceCm, usableDepthCm: c.usableDepthCm };
  }
  return { deviceId, tokenHash, calibration, test: deviceId.startsWith('device-test-') };
}

export function authorizeDevice(config: TelemetryConfig, authorization?: string) {
  return authorization?.startsWith('Bearer ') && tokenMatches(authorization.slice(7), config.tokenHash);
}

export function buildBatch(input: unknown, workspaceId: string, config: TelemetryConfig, now = Date.now()): TelemetryBatch {
  const batch = input as {
    deviceId?: unknown; bootId?: unknown; seq?: unknown; sampledAtMs?: unknown;
    readings?: { binId: string; pulseUs: number; beforeHigh: boolean; afterHigh: boolean }[];
  };
  if (batch?.deviceId !== config.deviceId || typeof batch.bootId !== 'string' || !/^[a-f0-9]{32}$/.test(batch.bootId) ||
    typeof batch.seq !== 'number' || !Number.isSafeInteger(batch.seq) || batch.seq < 0 || batch.seq > 0xffffffff ||
    typeof batch.sampledAtMs !== 'number' || !Number.isSafeInteger(batch.sampledAtMs) ||
    batch.sampledAtMs < now - 120000 || batch.sampledAtMs > now + 5000 ||
    !Array.isArray(batch.readings) || batch.readings.length !== physicalChannels.length)
    throw Error('Invalid telemetry envelope');
  const readings = physicalChannels.map(binId => {
    const row = batch.readings!.find(item => item?.binId === binId);
    if (!row || !Number.isSafeInteger(row.pulseUs) || row.pulseUs < 0 || row.pulseUs > 30000 ||
      typeof row.beforeHigh !== 'boolean' || typeof row.afterHigh !== 'boolean')
      throw Error('Invalid sensor diagnostics or mapping');
    return { binId, pulseUs: row.pulseUs, beforeHigh: row.beforeHigh, afterHigh: row.afterHigh };
  });
  const receivedAt = new Date(now);
  const sampledAt = new Date(batch.sampledAtMs);
  const id = hashToken(JSON.stringify([workspaceId, config.deviceId, batch.bootId, batch.seq]));
  return {
    _id: id, workspaceId, deviceId: config.deviceId, test: config.test, slot: Math.floor(now / 5000),
    payloadHash: hashToken(JSON.stringify([batch.sampledAtMs, readings])),
    receivedAt, sampledAt, expiresAt: new Date(now + 7 * 86400000),
    bins: readings.map((row, index) => {
      const distance = row.pulseUs === 0 ? null : Math.round(row.pulseUs * 0.0343 / 2 * 100) / 100;
      const observation = diagnosticObservation(index, row.pulseUs, distance, row.beforeHigh, row.afterHigh);
      const calibration = config.calibration[row.binId] ?? null;
      return {
        ...observation, deviceId: config.deviceId, label: `${config.test ? 'TEST · ' : ''}Sensor ${index + 1} · ${row.binId}`,
        readingId: `${id}:${row.binId}`, sampledAt: sampledAt.toISOString(), receivedAt: receivedAt.toISOString(),
        calibration, history: [],
        fillPercent: calibration && observation.status === 'VALID'
          ? fillFromDistance(observation.distanceCm, calibration.emptyDistanceCm, calibration.emptyDistanceCm - calibration.usableDepthCm)
          : null,
      };
    }),
  };
}

export function cloudSnapshot(batches: TelemetryBatch[], config: TelemetryConfig) {
  const latest = batches[0];
  return {
    source: 'PHYSICAL', origin: config.test ? 'CLOUD_TEST' : 'CLOUD_WIFI', staleAfterMs: cloudStaleMs,
    bins: latest ? latest.bins.map(bin => ({
      ...bin,
      history: batches.slice().reverse().flatMap(batch => batch.bins.filter(row => row.id === bin.id).map(row => ({
        receivedAt: row.receivedAt, sampledAt: row.sampledAt, fillPercent: row.fillPercent,
        distanceCm: row.distanceCm, status: row.status,
      }))),
    })) : [],
  };
}
