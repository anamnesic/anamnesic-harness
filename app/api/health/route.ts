export const runtime = 'nodejs';

export async function GET() {
    return Response.json({
        status: 'ok',
        service: 'Kairos API',
        timestamp: new Date().toISOString(),
    });
}
