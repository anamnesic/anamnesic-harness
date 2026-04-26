import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import AdmZip from 'adm-zip';

interface HostInstalledEntry {
    id: string;
    vsixPath?: string;
}

const HOST_STORE_PATH = resolve(process.cwd(), 'logs', 'open-vsx-host-installed.json');
const EXTRACT_ROOT = resolve(process.cwd(), 'logs', 'open-vsx-extracted');

function normalizeId(id: string): string {
    return id.trim().toLowerCase();
}

function getSafeDirName(id: string): string {
    return normalizeId(id).replace(/[^a-z0-9._-]/g, '_');
}

async function readHostStore(): Promise<HostInstalledEntry[]> {
    try {
        const raw = await readFile(HOST_STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .filter((entry) => entry && typeof entry.id === 'string')
            .map((entry) => ({
                id: normalizeId(String(entry.id)),
                vsixPath: typeof entry.vsixPath === 'string' ? entry.vsixPath : undefined,
            }));
    } catch {
        return [];
    }
}

function pickHtmlCandidate(entries: string[]): string | null {
    const htmlEntries = entries
        .filter((entry) => entry.toLowerCase().endsWith('.html'))
        .filter((entry) => !entry.toLowerCase().includes('node_modules'));

    if (htmlEntries.length === 0) {
        return null;
    }

    const ranked = [...htmlEntries].sort((a, b) => {
        const score = (value: string) => {
            const lower = value.toLowerCase();
            let s = 0;
            if (lower.includes('/webview/')) s += 8;
            if (lower.includes('/media/')) s += 6;
            if (lower.endsWith('/index.html')) s += 5;
            if (lower.includes('sidebar')) s += 4;
            if (lower.includes('chat')) s += 3;
            if (lower.includes('/dist/')) s += 1;
            return s;
        };

        const sa = score(a);
        const sb = score(b);
        if (sa !== sb) {
            return sb - sa;
        }
        return a.length - b.length;
    });

    return ranked[0] ?? null;
}

async function ensureExtracted(extensionId: string, vsixPath: string): Promise<{ rootDir: string; htmlRelPath: string | null }> {
    const safeId = getSafeDirName(extensionId);
    const extensionRoot = resolve(EXTRACT_ROOT, safeId);
    const markerPath = resolve(extensionRoot, '.kairos-extracted.json');

    await mkdir(extensionRoot, { recursive: true });

    if (!existsSync(markerPath)) {
        const zip = new AdmZip(vsixPath);
        zip.extractAllTo(extensionRoot, true);

        const entryNames = zip.getEntries().map((entry) => entry.entryName);
        const htmlRelPath = pickHtmlCandidate(entryNames);

        await writeFile(
            markerPath,
            JSON.stringify({ htmlRelPath, extractedAt: new Date().toISOString() }, null, 2),
            'utf-8',
        );

        return { rootDir: extensionRoot, htmlRelPath };
    }

    try {
        const markerRaw = await readFile(markerPath, 'utf-8');
        const marker = JSON.parse(markerRaw) as { htmlRelPath?: string };
        return { rootDir: extensionRoot, htmlRelPath: marker.htmlRelPath ?? null };
    } catch {
        return { rootDir: extensionRoot, htmlRelPath: null };
    }
}

function ensurePathInsideRoot(rootDir: string, targetPath: string): void {
    const normalizedRoot = `${rootDir}${sep}`;
    if (!targetPath.startsWith(normalizedRoot) && targetPath !== rootDir) {
        throw new Error('Invalid extension file path');
    }
}

export async function resolveInstalledVsixUi(namespace: string, name: string): Promise<{
    extensionId: string;
    available: boolean;
    reason?: string;
    rootDir?: string;
    htmlRelPath?: string;
}> {
    const extensionId = normalizeId(`${namespace}.${name}`);
    const installed = await readHostStore();
    const entry = installed.find((item) => item.id === extensionId);

    if (!entry?.vsixPath) {
        return { extensionId, available: false, reason: 'VSIX nao encontrada no armazenamento interno do Kairos.' };
    }

    if (!existsSync(entry.vsixPath)) {
        return { extensionId, available: false, reason: 'Arquivo VSIX nao existe mais no disco.' };
    }

    const extracted = await ensureExtracted(extensionId, entry.vsixPath);
    if (!extracted.htmlRelPath) {
        return { extensionId, available: false, reason: 'Extensao nao expoe HTML de interface detectavel.' };
    }

    return {
        extensionId,
        available: true,
        rootDir: extracted.rootDir,
        htmlRelPath: extracted.htmlRelPath,
    };
}

export async function getUiRenderHtml(namespace: string, name: string): Promise<{ html: string; extensionId: string }> {
    const descriptor = await resolveInstalledVsixUi(namespace, name);
    if (!descriptor.available || !descriptor.rootDir || !descriptor.htmlRelPath) {
        throw new Error(descriptor.reason ?? 'UI da extensao indisponivel');
    }

    const htmlAbsPath = resolve(descriptor.rootDir, descriptor.htmlRelPath);
    ensurePathInsideRoot(descriptor.rootDir, htmlAbsPath);

    const rawHtml = await readFile(htmlAbsPath, 'utf-8');
    const htmlDirRel = descriptor.htmlRelPath.split('/').slice(0, -1).join('/');
    const baseHref = `/api/v1/extensions/open-vsx/${namespace}/${name}/ui/file/${htmlDirRel ? `${htmlDirRel}/` : ''}`;

        const bridge = `<script>
(function(){
    const state = {};
    const extensionId = ${JSON.stringify(descriptor.extensionId)};

    function getKairosToken(){
        try { return localStorage.getItem('kairos-token') || ''; } catch (_) { return ''; }
    }

    function withAuthHeaders(input){
        try {
            const token = getKairosToken();
            const headers = new Headers((input && input.headers) || {});
            if (token && !headers.has('Authorization')) {
                headers.set('Authorization', 'Bearer ' + token);
            }
            if (!headers.has('X-Kairos-Extension-Id')) {
                headers.set('X-Kairos-Extension-Id', extensionId);
            }
            return Object.assign({}, input || {}, { headers, credentials: (input && input.credentials) || 'same-origin' });
        } catch (_) {
            return input || {};
        }
    }

    const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
    if (nativeFetch) {
        window.fetch = function(input, init){
            try {
                return nativeFetch(input, withAuthHeaders(init));
            } catch (_) {
                return nativeFetch(input, init);
            }
        };
    }

    const NativeXHR = window.XMLHttpRequest;
    if (NativeXHR) {
        function WrappedXHR(){
            const xhr = new NativeXHR();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;
            xhr.open = function(){
                return originalOpen.apply(xhr, arguments);
            };
            xhr.send = function(body){
                try {
                    const token = getKairosToken();
                    if (token) {
                        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                    }
                    xhr.setRequestHeader('X-Kairos-Extension-Id', extensionId);
                } catch (_) {}
                return originalSend.call(xhr, body);
            };
            return xhr;
        }
        WrappedXHR.prototype = NativeXHR.prototype;
        window.XMLHttpRequest = WrappedXHR;
    }

    const vscodeApi = {
        postMessage: function(message){
            try {
                window.parent && window.parent.postMessage({
                    source: 'kairos-open-vsx-ui',
                    extensionId: extensionId,
                    message: message
                }, '*');
            } catch (_) {}
        },
        setState: function(value){ state.value = value; },
        getState: function(){ return state.value; }
    };

    window.acquireVsCodeApi = function(){ return vscodeApi; };
    if (!window.vscode) {
        window.vscode = { postMessage: vscodeApi.postMessage };
    }

    window.addEventListener('message', function(event){
        const payload = event && event.data;
        if (!payload || payload.source !== 'kairos-host') {
            return;
        }
        if (payload.type === 'kairos:set-view') {
            try {
                window.dispatchEvent(new CustomEvent('kairos:set-view', { detail: payload.viewKey }));
            } catch (_) {}
        }
    });
})();
</script>`;

    let nextHtml = rawHtml;
    if (/<head[^>]*>/i.test(nextHtml)) {
        nextHtml = nextHtml.replace(/<head[^>]*>/i, (head) => `${head}<base href="${baseHref}">${bridge}`);
    } else {
        nextHtml = `<!doctype html><html><head><base href="${baseHref}">${bridge}</head><body>${nextHtml}</body></html>`;
    }

    return {
        html: nextHtml,
        extensionId: descriptor.extensionId,
    };
}

export async function readUiAsset(namespace: string, name: string, relativePathParts: string[]): Promise<{ data: Buffer; ext: string }> {
    const descriptor = await resolveInstalledVsixUi(namespace, name);
    if (!descriptor.available || !descriptor.rootDir) {
        throw new Error(descriptor.reason ?? 'UI da extensao indisponivel');
    }

    const relPath = relativePathParts.join('/');
    if (!relPath || relPath.includes('..')) {
        throw new Error('Caminho de asset invalido');
    }

    const absPath = resolve(descriptor.rootDir, relPath);
    ensurePathInsideRoot(descriptor.rootDir, absPath);

    const data = await readFile(absPath);
    return { data, ext: extname(absPath).toLowerCase() };
}

export function inferContentType(ext: string): string {
    switch (ext) {
        case '.html': return 'text/html; charset=utf-8';
        case '.js': return 'application/javascript; charset=utf-8';
        case '.mjs': return 'application/javascript; charset=utf-8';
        case '.css': return 'text/css; charset=utf-8';
        case '.json': return 'application/json; charset=utf-8';
        case '.svg': return 'image/svg+xml';
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.gif': return 'image/gif';
        case '.webp': return 'image/webp';
        case '.ico': return 'image/x-icon';
        case '.woff': return 'font/woff';
        case '.woff2': return 'font/woff2';
        case '.ttf': return 'font/ttf';
        case '.map': return 'application/json; charset=utf-8';
        default: return 'application/octet-stream';
    }
}

export async function listExtractedUiFiles(namespace: string, name: string): Promise<string[]> {
    const descriptor = await resolveInstalledVsixUi(namespace, name);
    if (!descriptor.available || !descriptor.rootDir) {
        return [];
    }

    const out: string[] = [];

    async function walk(currentDir: string, prefix = ''): Promise<void> {
        const entries = await readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith('.')) {
                continue;
            }
            const full = resolve(currentDir, entry.name);
            const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
                await walk(full, rel);
            } else {
                out.push(rel);
            }
        }
    }

    await walk(descriptor.rootDir);
    return out.sort();
}
