export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import path from 'path';

// Module-level state — resets on redeploy
const observers: Record<string, { id: string; title: string; status: string; subtitle: string; active: boolean }> = {
    fs: {
        id: 'fs',
        title: 'FS Watcher',
        status: 'Active',
        subtitle: path.join(process.cwd(), 'src'),
        active: true,
    },
    terminal: {
        id: 'terminal',
        title: 'Terminal',
        status: 'Listening',
        subtitle: 'Shell hooks',
        active: true,
    },
    api: {
        id: 'api',
        title: 'API Monitor',
        status: 'Paused',
        subtitle: 'REST Hooks',
        active: false,
    },
};

export async function GET() {
    return ok({ observers: Object.values(observers) });
}

export async function PATCH(req: NextRequest) {
    try {
        const { id, active }: { id: string; active: boolean } = await req.json();
        if (!observers[id]) return err('NOT_FOUND', `Observer '${id}' not found`, 404);
        observers[id].active = active;
        observers[id].status = active ? (id === 'terminal' ? 'Listening' : 'Active') : 'Paused';
        return ok({ observer: observers[id] });
    } catch {
        return err('INTERNAL_ERROR', 'Failed to update observer', 500);
    }
}
