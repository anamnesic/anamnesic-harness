/**
 * Direct client to the Antigravity language_server.exe (same backend that
 * powers Cascade / agent mode inside the Antigravity editor).
 *
 * Architecture (reverse-engineered from
 * `resources/app/extensions/antigravity/dist/extension.js`):
 *
 *   1. The core extension spawns `language_server_<platform>.exe` and waits
 *      for it to write a discovery JSON at:
 *        ~/.gemini/antigravity/daemon/ls_<sha256(resource).slice(0,16)>.json
 *      Shape: { pid, httpsPort, httpPort, lspPort, csrfToken, lsVersion }
 *
 *   2. Extension talks to the LS over HTTPS (self-signed cert) using
 *      gRPC-Web framing. The bundle accepts both `application/grpc-web+proto`
 *      and `application/grpc-web+json`; we pick JSON — no .proto needed.
 *
 *   3. Auth is a single header: `Authorization: <csrfToken>` (raw, no Bearer).
 *
 * This module ONLY provides transport + discovery. Concrete service/method
 * names must be probed at runtime (see `probeServices`) because the proto
 * isn't public and changes per LS release. Method names confirmed to exist
 * in the bundle: GetCompletions, GetChatMessage, CancelRequest, Heartbeat,
 * GetProcessInfo.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';

// ─── Discovery ────────────────────────────────────────────────────────────────

export interface DiscoveryInfo {
    pid: number;
    httpsPort: number;
    httpPort: number;
    lspPort: number;
    csrfToken: string;
    lsVersion: string;
    /** Absolute path of the discovery file this came from. */
    filePath: string;
}

const APP_DATA_DIR_NAMES = ['antigravity', 'antigravity-insiders'] as const;

/**
 * Computes the discovery filename the extension uses:
 *   ls_<sha256(resource).slice(0,16)>.json
 * where `resource` is the authority string for remote/local workspace —
 * empty string for the local machine (most common case).
 */
function discoveryFileName(resource: string = ''): string {
    const hash = crypto.createHash('sha256').update(resource).digest('hex').slice(0, 16);
    return `ls_${hash}.json`;
}

function candidateDaemonDirs(): string[] {
    return APP_DATA_DIR_NAMES.map((name) =>
        path.join(os.homedir(), '.gemini', name, 'daemon'),
    );
}

/**
 * Finds the currently running local language server. Returns `undefined` when
 * Antigravity is closed (no discovery file) or the PID inside is stale.
 */
export function findRunningLanguageServer(): DiscoveryInfo | undefined {
    const wanted = discoveryFileName('');
    for (const dir of candidateDaemonDirs()) {
        const full = path.join(dir, wanted);
        if (!fs.existsSync(full)) continue;

        let parsed: Partial<DiscoveryInfo>;
        try {
            parsed = JSON.parse(fs.readFileSync(full, 'utf-8'));
        } catch {
            continue;
        }

        if (!parsed.pid || !parsed.httpsPort || !parsed.csrfToken) continue;
        if (!isProcessAlive(parsed.pid)) continue;

        return { ...(parsed as DiscoveryInfo), filePath: full };
    }

    // Fallback: any ls_*.json in any candidate dir (e.g. remote-workspace variants)
    for (const dir of candidateDaemonDirs()) {
        if (!fs.existsSync(dir)) continue;
        for (const entry of fs.readdirSync(dir)) {
            if (!/^ls_[0-9a-f]+\.json$/i.test(entry)) continue;
            const full = path.join(dir, entry);
            try {
                const parsed = JSON.parse(fs.readFileSync(full, 'utf-8')) as Partial<DiscoveryInfo>;
                if (parsed.pid && parsed.httpsPort && parsed.csrfToken && isProcessAlive(parsed.pid)) {
                    return { ...(parsed as DiscoveryInfo), filePath: full };
                }
            } catch {
                /* skip */
            }
        }
    }

    return undefined;
}

function isProcessAlive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch (err) {
        // EPERM means the process exists but we can't signal it — still alive.
        return (err as NodeJS.ErrnoException).code === 'EPERM';
    }
}

// ─── gRPC-Web transport ───────────────────────────────────────────────────────

/** gRPC-Web frame: 1 byte flags (0=data, 128=trailers) + 4 bytes BE length. */
function encodeGrpcWebFrame(payload: Buffer, trailers = false): Buffer {
    const header = Buffer.alloc(5);
    header[0] = trailers ? 0x80 : 0x00;
    header.writeUInt32BE(payload.byteLength, 1);
    return Buffer.concat([header, payload]);
}

interface GrpcWebFrame {
    trailers: boolean;
    payload: Buffer;
}

function* decodeGrpcWebFrames(buf: Buffer): Generator<GrpcWebFrame> {
    let offset = 0;
    while (offset + 5 <= buf.byteLength) {
        const flags = buf[offset];
        const len = buf.readUInt32BE(offset + 1);
        if (offset + 5 + len > buf.byteLength) return;
        yield {
            trailers: (flags & 0x80) !== 0,
            payload: buf.subarray(offset + 5, offset + 5 + len),
        };
        offset += 5 + len;
    }
}

function parseGrpcTrailers(buf: Buffer): Record<string, string> {
    const text = buf.toString('utf-8');
    const out: Record<string, string> = {};
    for (const line of text.split(/\r?\n/)) {
        const idx = line.indexOf(':');
        if (idx > 0) out[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
    }
    return out;
}

export class GrpcStatusError extends Error {
    constructor(public readonly code: number, public readonly grpcMessage: string) {
        super(`gRPC status ${code}: ${grpcMessage}`);
    }
}

export interface UnaryCallOptions {
    /** e.g. "exa.language_server_pb.LanguageServerService" */
    service: string;
    /** e.g. "GetProcessInfo" */
    method: string;
    /** Request body as a JS object — serialized as JSON. */
    request: unknown;
    signal?: AbortSignal;
    /** Extra headers (for debugging / request-id propagation). */
    headers?: Record<string, string>;
}

/** Stateless client — constructed per call from the latest discovery file. */
export class LanguageServerClient {
    constructor(private readonly info: DiscoveryInfo) {}

    static connect(): LanguageServerClient {
        const info = findRunningLanguageServer();
        if (!info) {
            throw new Error(
                'Antigravity language server is not running. ' +
                    'Open the Antigravity editor at least once so it spawns the daemon.',
            );
        }
        return new LanguageServerClient(info);
    }

    get discovery(): DiscoveryInfo {
        return this.info;
    }

    /** Unary call — resolves with a single JSON object when the server responds. */
    async unary<TResponse = unknown>(opts: UnaryCallOptions): Promise<TResponse> {
        const chunks: Buffer[] = [];
        for await (const msg of this.serverStream<TResponse>(opts)) {
            chunks.push(Buffer.from(JSON.stringify(msg)));
        }
        if (chunks.length === 0) throw new Error('server closed without a response message');
        // For unary calls we expect exactly one message — return the first.
        return JSON.parse(chunks[0].toString('utf-8')) as TResponse;
    }

    /** Server-streaming call — yields one JS object per gRPC-Web data frame. */
    async *serverStream<TResponse = unknown>(
        opts: UnaryCallOptions,
    ): AsyncGenerator<TResponse, void, void> {
        const body = encodeGrpcWebFrame(Buffer.from(JSON.stringify(opts.request)));

        const reqOptions: https.RequestOptions = {
            host: '127.0.0.1',
            port: this.info.httpsPort,
            method: 'POST',
            path: `/${opts.service}/${opts.method}`,
            // LS uses a self-signed cert — we pin to loopback so this is safe.
            rejectUnauthorized: false,
            headers: {
                'Content-Type': 'application/grpc-web+json',
                'Accept': 'application/grpc-web+json',
                'X-Grpc-Web': '1',
                'X-User-Agent': 'antigravity-llm-server/0.1',
                'Authorization': this.info.csrfToken,
                'Content-Length': String(body.byteLength),
                ...opts.headers,
            },
        };

        const response = await new Promise<import('http').IncomingMessage>((resolve, reject) => {
            const req = https.request(reqOptions, resolve);
            req.on('error', reject);
            opts.signal?.addEventListener('abort', () => req.destroy(new Error('aborted')));
            req.end(body);
        });

        if (response.statusCode && response.statusCode >= 400) {
            // Drain body for error text
            const errChunks: Buffer[] = [];
            for await (const c of response) errChunks.push(c as Buffer);
            const text = Buffer.concat(errChunks).toString('utf-8');
            throw new Error(
                `HTTP ${response.statusCode} from ${opts.service}/${opts.method}: ${text.slice(0, 500)}`,
            );
        }

        let buffered = Buffer.alloc(0);
        let trailers: Record<string, string> | undefined;

        for await (const chunk of response) {
            buffered = Buffer.concat([buffered, chunk as Buffer]);

            // Consume complete frames
            let consumed = 0;
            for (const frame of decodeGrpcWebFrames(buffered)) {
                consumed += 5 + frame.payload.byteLength;
                if (frame.trailers) {
                    trailers = parseGrpcTrailers(frame.payload);
                } else {
                    yield JSON.parse(frame.payload.toString('utf-8')) as TResponse;
                }
            }
            if (consumed > 0) buffered = buffered.subarray(consumed);
        }

        // Check gRPC status from trailers (HTTP-trailer form or trailer-frame form)
        const grpcStatus = trailers?.['grpc-status'] ?? (response.trailers as Record<string, string> | undefined)?.['grpc-status'];
        if (grpcStatus && grpcStatus !== '0') {
            const grpcMsg = trailers?.['grpc-message'] ?? (response.trailers as Record<string, string> | undefined)?.['grpc-message'] ?? '';
            throw new GrpcStatusError(Number(grpcStatus), decodeURIComponent(grpcMsg));
        }
    }
}

// ─── Probe ────────────────────────────────────────────────────────────────────

/**
 * Candidate (service, method, trivial-request) tuples to test against the LS.
 * Names come from the Codeium/Exa lineage — they're educated guesses; the
 * probe reports which actually resolve.
 */
export const PROBE_TARGETS: ReadonlyArray<{
    service: string;
    method: string;
    request: unknown;
    streaming: boolean;
}> = [
    // Most likely service names — LS shares ancestry with open-source Codeium
    { service: 'exa.language_server_pb.LanguageServerService', method: 'GetProcessInfo', request: {}, streaming: false },
    { service: 'exa.language_server_pb.LanguageServerService', method: 'Heartbeat', request: {}, streaming: false },
    { service: 'exa.chat_pb.ChatService', method: 'ListModels', request: {}, streaming: false },
    { service: 'exa.seat_management_pb.SeatManagementService', method: 'GetUserStatus', request: {}, streaming: false },
    { service: 'exa.cascade_pb.CascadeService', method: 'ListModels', request: {}, streaming: false },
    { service: 'LanguageServerService', method: 'GetProcessInfo', request: {}, streaming: false },
];

export interface ProbeResult {
    target: (typeof PROBE_TARGETS)[number];
    ok: boolean;
    status?: number;
    grpcStatus?: number;
    sample?: unknown;
    error?: string;
}

/** Iterates every probe target and reports what the LS accepts. */
export async function probeServices(
    client: LanguageServerClient = LanguageServerClient.connect(),
): Promise<ProbeResult[]> {
    const results: ProbeResult[] = [];
    for (const target of PROBE_TARGETS) {
        try {
            const sample = await client.unary({
                service: target.service,
                method: target.method,
                request: target.request,
            });
            results.push({ target, ok: true, sample });
        } catch (err) {
            if (err instanceof GrpcStatusError) {
                // A non-zero gRPC status still means the route EXISTS — the
                // request shape is just wrong. That's a very useful signal.
                results.push({
                    target,
                    ok: false,
                    grpcStatus: err.code,
                    error: err.grpcMessage,
                });
            } else {
                results.push({ target, ok: false, error: (err as Error).message });
            }
        }
    }
    return results;
}
