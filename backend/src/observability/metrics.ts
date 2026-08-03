/**
 * Metrics-ready counters/timers.
 * Swap the in-memory backend for Prometheus/OpenTelemetry exporters later
 * without changing call sites.
 */

type Labels = Record<string, string | number | undefined>;

interface Counter {
  inc(labels?: Labels, value?: number): void;
}

interface Histogram {
  observe(labels: Labels | undefined, valueMs: number): void;
}

class MemoryCounter implements Counter {
  private values = new Map<string, number>();

  inc(labels: Labels = {}, value = 1): void {
    const key = serialize(labels);
    this.values.set(key, (this.values.get(key) ?? 0) + value);
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.values);
  }
}

class MemoryHistogram implements Histogram {
  private samples: Array<{ labels: string; value: number }> = [];

  observe(labels: Labels = {}, valueMs: number): void {
    this.samples.push({ labels: serialize(labels), value: valueMs });
    if (this.samples.length > 5_000) this.samples.shift();
  }

  snapshot(): { count: number; p50?: number; p95?: number } {
    if (this.samples.length === 0) return { count: 0 };
    const sorted = [...this.samples.map((s) => s.value)].sort((a, b) => a - b);
    return {
      count: sorted.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  }
}

function serialize(labels: Labels): string {
  return Object.entries(labels)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join(",");
}

export const metrics = {
  httpRequests: new MemoryCounter(),
  httpDurationMs: new MemoryHistogram(),
  pdfImports: new MemoryCounter(),
  authAttempts: new MemoryCounter(),
  dbErrors: new MemoryCounter(),
};

/** Optional debug snapshot — not exposed publicly by default. */
export function metricsSnapshot() {
  return {
    httpRequests: metrics.httpRequests.snapshot(),
    httpDurationMs: metrics.httpDurationMs.snapshot(),
    pdfImports: metrics.pdfImports.snapshot(),
    authAttempts: metrics.authAttempts.snapshot(),
    dbErrors: metrics.dbErrors.snapshot(),
  };
}
