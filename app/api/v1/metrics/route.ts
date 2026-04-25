export const runtime = 'nodejs';

import os from 'os';
import { ok } from '@/app/api/_lib/response';

export async function GET() {
    const uptimeSec = process.uptime();
    const uptimeDays = Math.floor(uptimeSec / 86400);
    const uptimeHours = Math.floor(uptimeSec / 3600);
    const mem = process.memoryUsage();
    const loadRaw = os.loadavg()[0];

    return ok({
        uptime: uptimeDays > 0 ? `${uptimeDays}d` : uptimeHours > 0 ? `${uptimeHours}h` : '<1h',
        memory: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
        loadAvg: `${Math.min(loadRaw, 99.9).toFixed(1)}%`,
        threads: os.cpus().length,
        platform: process.platform,
        nodeVersion: process.version,
    });
}
