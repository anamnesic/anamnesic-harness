export const runtime = 'nodejs';

import { getDb } from '@/app/api/_lib/db';

export async function GET() {
    const timestamp = new Date().toISOString();

    let database = 'ok';
    let dbError: string | null = null;

    try {
        const db = await getDb();
        await db.query('SELECT 1');
    } catch (error) {
        database = 'error';
        dbError = error instanceof Error ? error.message : 'Unknown database error';
    }

    const status = database === 'ok' ? 'ok' : 'degraded';

    return Response.json({
        status,
        service: 'Kairos API',
        timestamp,
        checks: {
            database,
        },
        details: dbError ? { database: dbError } : undefined,
    });
}
