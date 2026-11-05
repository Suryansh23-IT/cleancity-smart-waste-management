import {
  boundedJson,
  database,
  databaseReady,
  json,
  tokenMatches,
  validatePayload,
} from "../server/telemetry.js";
export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST")
      return json({ error: "Method not allowed" }, 405);
    if (!databaseReady())
      return json({ error: "Physical cloud not configured" }, 503);
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer "))
      return json({ error: "Unauthorized" }, 401);
    let payload;
    try {
      payload = validatePayload(await boundedJson(request));
    } catch {
      return json(
        {
          error:
            "Invalid JSON payload, content type or measurement range (max 8192 bytes)",
        },
        400,
      );
    }
    try {
      const devices = await database(
        `devices?id=eq.${encodeURIComponent(payload.deviceId)}&select=token_hash,enabled`,
      );
      if (
        !devices[0]?.enabled ||
        !tokenMatches(auth.slice(7), devices[0].token_hash)
      )
        return json({ error: "Unauthorized" }, 401);
      const result = await database("rpc/ingest_readings", {
        method: "POST",
        body: JSON.stringify({ payload }),
      });
      return json(
        { source: "PHYSICAL", ...result },
        result.rateLimited ? 429 : result.rejected ? 400 : 200,
      );
    } catch {
      return json(
        { error: "Physical storage unavailable; retry with backoff" },
        503,
      );
    }
  },
};
