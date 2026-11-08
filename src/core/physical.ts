export const physicalChannels = ['BIN-001', 'BIN-002', 'BIN-003', 'BIN-004'] as const;
export const cloudStaleMs = 45000;
export type PhysicalTransport = 'usb' | 'wifi';
export type PhysicalOrigin = 'LOCAL_USB' | 'CLOUD_WIFI' | 'CLOUD_TEST';
export const physicalEndpoint = (transport: PhysicalTransport) =>
  transport === 'wifi' ? '/api/telemetry/snapshot' : '/api/physical';

export interface PhysicalBin {
  id: string;
  label: string;
  distanceCm: number | null;
  fillPercent: number | null;
  receivedAt: string | null;
  sampledAt?: string;
  readingId?: string;
  deviceId: string;
  history: { receivedAt: string; fillPercent: number | null;distanceCm?:number|null;status?:string }[];
  status?:string;
  reason?:string|null;
  calibration?:{emptyDistanceCm:number;usableDepthCm:number}|null;
  lastValid?:{distanceCm:number;receivedAt:string}|null;
}
export function staleReading(
  receivedAt: string | null,
  now = Date.now(),
): boolean {
  const time = receivedAt === null ? NaN : Date.parse(receivedAt);
  return !Number.isFinite(time) || time > now + 5000 || now - time > 90000;
}
export function cloudReadingAge(bin: PhysicalBin | undefined, now = Date.now()) {
  const sample = Date.parse(bin?.sampledAt ?? '');
  const receipt = Date.parse(bin?.receivedAt ?? '');
  if (!Number.isFinite(sample) || !Number.isFinite(receipt) || sample > now + 5000 || receipt > now + 5000) return Infinity;
  return Math.max(0, now - Math.min(sample, receipt));
}
export function parsePhysical(input: unknown): PhysicalBin[] {
  const data = input as { source?: unknown; bins?: unknown;origin?:unknown;receiver?:{connected?:unknown};staleAfterMs?:unknown };
  if(data?.origin==='LOCAL_USB'&&(typeof data.receiver?.connected!=='boolean'||data.staleAfterMs!==10000))throw Error('Invalid local receiver contract');
  if (
    !data ||
    data.source !== "PHYSICAL" ||
    !Array.isArray(data.bins) ||
    data.bins.length > 4
  )
    throw Error("No verified physical API response");
  const fill = (v: unknown) =>
    v === null ||
    (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100);
  const stamp = (v: unknown) =>
    v === null || (typeof v === "string" && Number.isFinite(Date.parse(v)));
  const bins = data.bins as PhysicalBin[];
  if ((data.origin === 'CLOUD_WIFI' || data.origin === 'CLOUD_TEST') &&
      (data.staleAfterMs !== cloudStaleMs || bins.some(bin => !bin || typeof bin.sampledAt !== 'string' ||
        !stamp(bin.sampledAt) || typeof bin.readingId !== 'string' || !/^[a-f0-9]{64}:BIN-00[1-4]$/.test(bin.readingId) ||
        !bin.readingId.endsWith(':' + bin.id)))) throw Error('Invalid Wi-Fi telemetry contract');
  if (
    new Set(bins.map((b) => b?.id)).size !== bins.length ||
    bins.some(
      (b) =>
        !b ||
        !/^BIN-00[1-4]$/.test(b.id) ||
        typeof b.label !== "string" ||
        typeof b.deviceId !== "string" ||
        (b.status!==undefined&&!['UNKNOWN','VALID','NO_ECHO','INVALID'].includes(b.status)) ||
        !fill(b.fillPercent) ||
        !(
          b.distanceCm === null ||
          (typeof b.distanceCm === "number" &&
            Number.isFinite(b.distanceCm) &&
            b.distanceCm >= 2 &&
            b.distanceCm <= 400)
        ) ||
        !stamp(b.receivedAt) ||
        !Array.isArray(b.history) ||
        b.history.length > 30 ||
        b.history.some(
          (h) =>
            !h ||
            typeof h.receivedAt !== "string" ||
            !stamp(h.receivedAt) ||
            (h.distanceCm!==undefined&&h.distanceCm!==null&&(!Number.isFinite(h.distanceCm)||h.distanceCm<2||h.distanceCm>400)) ||
            !fill(h.fillPercent),
        ),
    )
  )
    throw Error(
      "Invalid physical telemetry response; retained readings are stale",
    );
  return bins;
}
