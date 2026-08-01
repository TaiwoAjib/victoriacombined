import fs from 'fs';
import path from 'path';

/**
 * Lightweight runtime memory management. Purely additive — it observes and
 * reclaims, and never touches application behaviour.
 *
 * What it does:
 *  1. Periodically logs heap/RSS so memory growth is visible in the host logs.
 *  2. When heap use crosses a threshold, runs V8 GC to release retained memory
 *     — but only if the process was started with --expose-gc (global.gc). If
 *     not available it just logs; nothing breaks.
 *  3. On startup, sweeps stale temp files left in uploads/ by an upload that
 *     crashed before its normal fs.unlink cleanup — "unwanted cache" on disk.
 *
 * Env controls (all optional):
 *  MEMORY_MANAGER_ENABLED   'false' to disable entirely (default on)
 *  MEMORY_CHECK_MINUTES     interval between checks (default 15)
 *  MEMORY_GC_THRESHOLD_MB   heapUsed above which GC is triggered (default 400)
 */

let started = false;

const sweepStaleUploads = () => {
  const dir = path.resolve(process.cwd(), 'uploads');
  try {
    if (!fs.existsSync(dir)) return;
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000; // never touch an in-flight upload
    let removed = 0;
    for (const name of fs.readdirSync(dir)) {
      const file = path.join(dir, name);
      try {
        const stat = fs.statSync(file);
        if (stat.isFile() && now - stat.mtimeMs > ONE_HOUR) {
          fs.unlinkSync(file);
          removed++;
        }
      } catch {
        /* ignore individual file errors */
      }
    }
    if (removed > 0) console.log(`[memory] swept ${removed} stale upload file(s)`);
  } catch (err) {
    console.error('[memory] upload sweep failed:', err);
  }
};

export const startMemoryManager = () => {
  if ((process.env.MEMORY_MANAGER_ENABLED || 'true').toLowerCase() === 'false') return;
  if (started) return;
  started = true;

  // One-time cleanup of any leftover temp files
  sweepStaleUploads();

  const intervalMin = Number(process.env.MEMORY_CHECK_MINUTES) || 15;
  const thresholdMb = Number(process.env.MEMORY_GC_THRESHOLD_MB) || 400;
  const toMb = (bytes: number) => Math.round(bytes / (1024 * 1024));

  const timer = setInterval(() => {
    const mem = process.memoryUsage();
    const heapMb = toMb(mem.heapUsed);
    const rssMb = toMb(mem.rss);

    if (heapMb > thresholdMb && typeof global.gc === 'function') {
      global.gc();
      const afterMb = toMb(process.memoryUsage().heapUsed);
      console.log(`[memory] heap ${heapMb}MB > ${thresholdMb}MB threshold — ran GC → ${afterMb}MB (rss ${rssMb}MB)`);
    } else {
      console.log(`[memory] heap ${heapMb}MB, rss ${rssMb}MB${typeof global.gc !== 'function' ? ' (gc unavailable; start with --expose-gc to enable reclaim)' : ''}`);
    }
  }, intervalMin * 60 * 1000);

  // Don't keep the process alive solely for the monitor
  if (typeof timer.unref === 'function') timer.unref();

  console.log(`[memory] manager started — checking every ${intervalMin}m, GC threshold ${thresholdMb}MB`);
};
