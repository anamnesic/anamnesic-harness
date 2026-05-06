export const runtime = 'nodejs';

import { checkDbConnection } from '@/app/api/_lib/db';

export async function GET() {
    const timestamp = new Date().toISOString();

    let database = 'ok';
    let dbError: string | null = null;

    try {
        const isConnected = await checkDbConnection();
        if (!isConnected) {
            database = 'error';
            dbError = 'Database connection failed';
        }
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
