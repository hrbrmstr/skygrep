import { HealthStatus } from "../types/types.ts";

export function handleHealth(healthStatus: HealthStatus) {
  const uptime = Date.now() - healthStatus.startTime;
  const timeSinceLastEvent = Date.now() - healthStatus.lastEventTime;

  healthStatus.isHealthy = timeSinceLastEvent < 5 * 60 * 1000;

  const health = {
    status: healthStatus.isHealthy ? "healthy" : "unhealthy",
    uptime_ms: uptime,
    last_event_ms_ago: timeSinceLastEvent,
  };

  return new Response(JSON.stringify(health, null, 2), {
    status: healthStatus.isHealthy ? 200 : 503,
    headers: { "Content-Type": "application/json" },
  });
}
