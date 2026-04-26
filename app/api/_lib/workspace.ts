import { NextRequest } from 'next/server';

/**
 * Extracts the workspace ID from the request.
 * Checks for X-Workspace-Id header first, then workspaceId search parameter.
 * Defaults to 'system' if not found.
 */
export function getWorkspaceId(req: NextRequest): string {
    const headerId = req.headers.get('x-workspace-id');
    if (headerId) return headerId;

    const { searchParams } = new URL(req.url);
    const paramId = searchParams.get('workspaceId');
    if (paramId) return paramId;

    return 'system';
}
