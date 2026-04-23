/**
 * Direct client to the Antigravity language_server binary — same process that
 * powers Cascade inside the editor.
 *
 * Discovery (verified by runtime probing on 2026-04-23):
 *
 *   The bundled extension does NOT write a stable discovery file. Each LS
 *   instance is spawned with argv like:
 *
 *     language_server_windows_x64.exe
 *       --csrf_token <uuid>
 *       --extension_server_port <n>
 *       --extension_server_csrf_token <uuid>
 *       --workspace_id <id>
 *       --cloud_code_endpoint https://cloudcode-pa.googleapis.com
 *       --app_data_dir antigravity
 *
 *   The LS listens on 2-3 local ports. The httpsPort is the lowest-numbered
 *   of the bound ports.
 *
 * Transport (verified):
 *
 *   - POST https://127.0.0.1:<httpsPort>/exa.language_server_pb.LanguageServerService/<Method>
 *   - Content-Type: application/json      (Connect unary protocol)
 *   - x-codeium-csrf-token: <csrf from argv>
 *   - Connect-Protocol-Version: 1
 *   - TLS cert is self-signed — pinned to 127.0.0.1 loopback
 *
 * Confirmed working endpoints:
 *   Heartbeat, GetUserStatus, GetAvailableModels, GetCascadeModelConfigData,
 *   GetWorkspaceInfos, StartCascade, SendUserCascadeMessage.
 */

import { execSync } from 'child_process';
import * as https from 'https';

// ─── Discovery ────────────────────────────────────────────────────────────────

export interface LanguageServerInfo {
    pid: number;
    csrfToken: string;
    httpsPort: number;
    /** All listening ports on this PID, sorted ascending. */
    ports: number[];
    workspaceId?: string;
    cloudCodeEndpoint?: string;
    persistentLsp: boolean;
}

/**
 * Enumerates running Antigravity language server instances on Windows by
 * querying Win32_Process for their argv and Get-NetTCPConnection for the
 * listening ports. Returns `[]` on other platforms (Antigravity is Windows-first).
 */
export function findRunningLanguageServers(): LanguageServerInfo[] {
    if (process.platform !== 'win32') return [];

    const script = [
        "$procs = Get-CimInstance Win32_Process -Filter \"Name='language_server_windows_x64.exe'\"",
        '$out = foreach ($p in $procs) {',
        '  $conns = Get-NetTCPConnection -State Listen -OwningProcess $p.ProcessId -ErrorAction SilentlyContinue | Sort-Object LocalPort | Select-Object -Expand LocalPort',
        '  [PSCustomObject]@{ Pid = $p.ProcessId; Cmd = $p.CommandLine; Ports = ($conns -join \',\') }',
        '}',
        '$out | ConvertTo-Json -Compress',
    ].join('; ');

    let psOut: string;
    try {
        psOut = execSync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, {
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'ignore'],
            windowsHide: true,
        });
    } catch {
        return [];
    }

    if (!psOut.trim()) return [];

    let raw: unknown;
    try {
        raw = JSON.parse(psOut);
    } catch {
        return [];
    }

    const items = (Array.isArray(raw) ? raw : [raw]) as Array<{
        Pid: number;
        Cmd: string;
        Ports: string;
    }>;

    const out: LanguageServerInfo[] = [];
    for (const item of items) {
        const cmd = item?.Cmd ?? '';
        const m = cmd.match(/--csrf_token\s+(\S+)/);
        if (!m) continue;
        const csrfToken = m[1];

        const ports = (item.Ports ?? '')
            .split(',')
            .map((s: string) => Number(s.trim()))
            .filter((n: number) => Number.isFinite(n) && n > 0)
            .sort((a: number, b: number) => a - b);
        if (ports.length === 0) continue;

        const workspaceMatch = cmd.match(/--workspace_id\s+(\S+)/);
        const endpointMatch = cmd.match(/--cloud_code_endpoint\s+(\S+)/);

        out.push({
            pid: Number(item.Pid),
            csrfToken,
            httpsPort: ports[0],
            ports,
            workspaceId: workspaceMatch?.[1],
            cloudCodeEndpoint: endpointMatch?.[1],
            persistentLsp: /--enable_lsp\b/.test(cmd),
        });
    }
    return out;
}

/**
 * Picks the LS instance most likely to correspond to the given workspace folder.
 * The workspaceId baked into argv looks like `file_c_3A_GitHub_thinkcoffee`.
 */
export function findLanguageServerForWorkspace(
    workspaceFolderFsPath?: string,
): LanguageServerInfo | undefined {
    const all = findRunningLanguageServers();
    if (all.length === 0) return undefined;

    if (workspaceFolderFsPath) {
        const norm = workspaceFolderFsPath
            .replace(/\\/g, '/')
            .replace(/:/g, '_3A_')
            .replace(/\//g, '_');
        const match = all.find(
            (info) =>
                info.workspaceId && norm.includes(info.workspaceId.replace(/^file_/, '')),
        );
        if (match) return match;
    }

    return all.find((i) => i.workspaceId) ?? all[0];
}

// ─── Transport ────────────────────────────────────────────────────────────────

export const LANGUAGE_SERVER_SERVICE = 'exa.language_server_pb.LanguageServerService';

export class ConnectError extends Error {
    constructor(
        public readonly httpStatus: number,
        public readonly code: string,
        message: string,
    ) {
        super(`Connect ${httpStatus} ${code}: ${message}`);
    }
}

export interface UnaryCallOptions<TReq = unknown> {
    service?: string;
    method: string;
    request?: TReq;
    signal?: AbortSignal;
}

export class LanguageServerClient {
    constructor(public readonly info: LanguageServerInfo) {}

    static connect(workspaceFolderFsPath?: string): LanguageServerClient {
        const info = findLanguageServerForWorkspace(workspaceFolderFsPath);
        if (!info) {
            throw new Error(
                'Antigravity language server is not running. Open the Antigravity editor first.',
            );
        }
        return new LanguageServerClient(info);
    }

    /** Makes a Connect unary JSON RPC. Throws `ConnectError` on non-2xx. */
    async unary<TRes = unknown, TReq = unknown>(
        opts: UnaryCallOptions<TReq>,
    ): Promise<TRes> {
        const service = opts.service ?? LANGUAGE_SERVER_SERVICE;
        const payload = Buffer.from(JSON.stringify(opts.request ?? {}));

        const response = await new Promise<import('http').IncomingMessage>((resolve, reject) => {
            const req = https.request(
                {
                    host: '127.0.0.1',
                    port: this.info.httpsPort,
                    method: 'POST',
                    path: `/${service}/${opts.method}`,
                    rejectUnauthorized: false,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Connect-Protocol-Version': '1',
                        'x-codeium-csrf-token': this.info.csrfToken,
                        'Content-Length': String(payload.byteLength),
                    },
                },
                resolve,
            );
            req.on('error', reject);
            opts.signal?.addEventListener('abort', () => req.destroy(new Error('aborted')));
            req.write(payload);
            req.end();
        });

        const chunks: Buffer[] = [];
        for await (const c of response) chunks.push(c as Buffer);
        const text = Buffer.concat(chunks).toString('utf-8');
        const status = response.statusCode ?? 0;

        if (status < 200 || status >= 300) {
            let code = 'unknown';
            let message = text;
            try {
                const parsed = JSON.parse(text) as { code?: string; message?: string };
                if (parsed.code) code = parsed.code;
                if (parsed.message) message = parsed.message;
            } catch {
                /* non-JSON body */
            }
            throw new ConnectError(status, code, message);
        }

        if (!text) return {} as TRes;
        return JSON.parse(text) as TRes;
    }
}

// ─── Typed convenience wrappers ───────────────────────────────────────────────

export interface AvailableModel {
    model: string;
    maxTokens?: number;
    tokenizerType?: string;
    apiProvider?: string;
    quotaInfo?: { remainingFraction?: number; resetTime?: string };
    isInternal?: boolean;
    supportsCumulativeContext?: boolean;
    [k: string]: unknown;
}

export interface GetAvailableModelsResponse {
    response?: { models?: Record<string, AvailableModel> };
}

export interface CascadeModelConfig {
    label: string;
    modelOrAlias?: { model?: string; alias?: string };
    supportsImages?: boolean;
    supportsTools?: boolean;
    isRecommended?: boolean;
    supportedMimeTypes?: Record<string, boolean>;
    allowedTiers?: string[];
    quotaInfo?: { remainingFraction?: number; resetTime?: string };
    [k: string]: unknown;
}

export interface GetCascadeModelConfigDataResponse {
    clientModelConfigs?: CascadeModelConfig[];
}

export interface UserStatusResponse {
    userStatus?: {
        name?: string;
        email?: string;
        planStatus?: { planInfo?: { teamsTier?: string; planName?: string } };
        [k: string]: unknown;
    };
}

export interface StartCascadeResponse {
    cascadeId: string;
}

export interface SendUserCascadeMessageRequest {
    cascadeId: string;
    content: string;
    model?: string;
    [k: string]: unknown;
}

export const LS = {
    ping(client: LanguageServerClient): Promise<{ lastExtensionHeartbeat?: string }> {
        return client.unary({ method: 'Heartbeat' });
    },
    userStatus(client: LanguageServerClient): Promise<UserStatusResponse> {
        return client.unary({ method: 'GetUserStatus' });
    },
    availableModels(client: LanguageServerClient): Promise<GetAvailableModelsResponse> {
        return client.unary({ method: 'GetAvailableModels' });
    },
    cascadeModels(
        client: LanguageServerClient,
    ): Promise<GetCascadeModelConfigDataResponse> {
        return client.unary({ method: 'GetCascadeModelConfigData' });
    },
    startCascade(client: LanguageServerClient): Promise<StartCascadeResponse> {
        return client.unary({ method: 'StartCascade' });
    },
    async sendUserCascadeMessage(
        client: LanguageServerClient,
        req: SendUserCascadeMessageRequest,
    ): Promise<void> {
        await client.unary({ method: 'SendUserCascadeMessage', request: req });
    },
};
