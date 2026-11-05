export interface PhysicalBin {
  id: string;
  label: string;
  distanceCm: number | null;
  fillPercent: number | null;
  receivedAt: string | null;
  deviceId: string;
  history: { receivedAt: string; fillPercent: number | null }[];
}
export function staleReading(
  receivedAt: string | null,
  now = Date.now(),
): boolean {
  const time = receivedAt === null ? NaN : Date.parse(receivedAt);
  return !Number.isFinite(time) || time > now + 5000 || now - time > 90000;
}
export function parsePhysical(input: unknown): PhysicalBin[] {
  const data = input as { source?: unknown; bins?: unknown };
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
  if (
    new Set(bins.map((b) => b?.id)).size !== bins.length ||
    bins.some(
      (b) =>
        !b ||
        !/^BIN-00[1-4]$/.test(b.id) ||
        typeof b.label !== "string" ||
        typeof b.deviceId !== "string" ||
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
            !fill(h.fillPercent),
        ),
    )
  )
    throw Error(
      "Invalid physical telemetry response; retained readings are stale",
    );
  return bins;
}
