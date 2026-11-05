import { Reading } from "./model";
export function forecast(history: Reading[], threshold = 80, now?: number) {
  const valid = history
    .filter(
      (h) =>
        Number.isFinite(h.time) &&
        Number.isFinite(h.fill) &&
        h.fill >= 0 &&
        h.fill <= 100,
    )
    .sort((a, b) => a.time - b.time);
  const sorted = valid
    .filter((h, i) => i === valid.length - 1 || h.time !== valid[i + 1].time)
    .slice(-5);
  if (
    now !== undefined &&
    sorted.length &&
    (now - sorted.at(-1)!.time > 3 * 3600000 || sorted.at(-1)!.time > now)
  )
    return { rate: null, hours: null, quality: "Stale or future history" };
  let start = 0;
  for (let i = 1; i < sorted.length; i++)
    if (sorted[i].fill < sorted[i - 1].fill) start = i; // Reset learning after a pickup/drop.
  const samples = sorted.slice(start),
    rates = samples
      .slice(1)
      .map(
        (h, i) =>
          (h.fill - samples[i].fill) / ((h.time - samples[i].time) / 3600000),
      )
      .filter(Number.isFinite);
  if (samples.length < 4 || rates.length < 3)
    return {
      rate: null,
      hours: null,
      quality: "Insufficient post-pickup history",
    };
  const rate = rates.reduce((a, b) => a + b, 0) / rates.length,
    deviation = Math.max(...rates) - Math.min(...rates);
  return {
    rate,
    hours:
      samples.at(-1)!.fill >= threshold
        ? 0
        : rate > 0
          ? (threshold - samples.at(-1)!.fill) / rate
          : null,
    quality:
      deviation > Math.max(5, rate * 2)
        ? "Low · noisy history"
        : "Average-growth estimate",
  };
}
