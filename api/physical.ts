import { database, databaseReady, json } from "../server/telemetry.js";
export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET")
      return json({ error: "Method not allowed" }, 405);
    if (!databaseReady() || process.env.PUBLIC_PHYSICAL_DEMO !== "true")
      return json({ error: "Public physical demo not configured" }, 503);
    try {
      const bins = await database("rpc/physical_snapshot", {
        method: "POST",
        body: "{}",
      });
      return json({ source: "PHYSICAL", bins });
    } catch {
      return json({ error: "Physical telemetry unavailable" }, 503);
    }
  },
};
