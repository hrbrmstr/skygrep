export function handleMetrics(ruleMetrics: Map<string, number>) {
  const metrics = Object.fromEntries(ruleMetrics);
  return new Response(JSON.stringify(metrics, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}
