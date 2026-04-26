export const runtime = 'nodejs';

import os from 'os';
import { ok } from '@/app/api/_lib/db'; // Wait, ok is in response.ts
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET() {
    try {
        const uptimeSec = process.uptime();
        const uptimeDays = Math.floor(uptimeSec / 86400);
        const uptimeHours = Math.floor(uptimeSec / 3600);
        const mem = process.memoryUsage();
        const loadRaw = os.loadavg()[0];

        const db = await getDb();
        const { MetricsService } = await import('@/src/core/services/MetricsService');
        const metricsService = MetricsService.getInstance(db);
        const appMetrics = metricsService.getMetrics('day');

        return ok({
            system: {
                uptime: uptimeDays > 0 ? `${uptimeDays}d` : uptimeHours > 0 ? `${uptimeHours}h` : '<1h',
                memory: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
                loadAvg: `${Math.min(loadRaw, 99.9).toFixed(1)}%`,
                threads: os.cpus().length,
                platform: process.platform,
                nodeVersion: process.version,
            },
            app: appMetrics,
            // Keep root fields for compatibility with Dashboard.tsx
            uptime: uptimeDays > 0 ? `${uptimeDays}d` : uptimeHours > 0 ? `${uptimeHours}h` : '<1h',
            memory: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
            loadAvg: `${Math.min(loadRaw, 99.9).toFixed(1)}%`,
            threads: os.cpus().length,
        });
    } catch (e) {
        return err('INTERNAL_ERROR', 'Failed to fetch metrics', 500);
    }
}
