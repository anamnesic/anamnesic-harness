import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
    mockSearch,
    mockGetExtension,
    mockGetReadme,
    mockHostStatus,
    mockDownloadVsix,
    mockInstallVsix,
    mockUninstallExtension,
    mockListInstalledExtensions,
} = vi.hoisted(() => ({
    mockSearch: vi.fn(),
    mockGetExtension: vi.fn(),
    mockGetReadme: vi.fn(),
    mockHostStatus: vi.fn(),
    mockDownloadVsix: vi.fn(),
    mockInstallVsix: vi.fn(),
    mockUninstallExtension: vi.fn(),
    mockListInstalledExtensions: vi.fn(),
}));

vi.mock('@/src/core/services/OpenVsxService', () => ({
    OpenVsxService: {
        getInstance: () => ({
            search: mockSearch,
            getExtension: mockGetExtension,
            getReadme: mockGetReadme,
        }),
    },
}));

vi.mock('@/src/core/services/OpenVsxHostInstaller', () => ({
    OpenVsxHostInstaller: {
        getInstance: () => ({
            getStatus: mockHostStatus,
            downloadVsix: mockDownloadVsix,
            installVsix: mockInstallVsix,
            uninstallExtension: mockUninstallExtension,
            listInstalledExtensions: mockListInstalledExtensions,
        }),
    },
}));

describe.sequential('Open VSX routes integration', () => {
    const originalCwd = process.cwd();
    let tempRoot = '';

    beforeEach(async () => {
        tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kairos-openvsx-routes-'));
        process.chdir(tempRoot);
        vi.resetModules();
        vi.clearAllMocks();

        mockHostStatus.mockReturnValue({ available: true, command: 'code' });
        mockDownloadVsix.mockResolvedValue(path.join(tempRoot, 'tmp.vsix'));
        mockInstallVsix.mockReturnValue({ command: 'code', args: ['--install-extension', 'tmp.vsix'], stdout: '', stderr: '' });
        mockUninstallExtension.mockReturnValue({ command: 'code', args: ['--uninstall-extension', 'ms-python.python'], stdout: '', stderr: '' });
        mockListInstalledExtensions.mockReturnValue([]);
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        if (tempRoot) {
            await fs.rm(tempRoot, { recursive: true, force: true });
        }
    });

    it('search route returns normalized Open VSX payload', async () => {
        mockSearch.mockResolvedValue({
            offset: 1,
            totalSize: 77,
            extensions: [
                {
                    id: 'ms-python.python',
                    namespace: 'ms-python',
                    name: 'python',
                    version: '2026.4.0',
                    displayName: 'Python',
                    description: 'Python support',
                    verified: true,
                    deprecated: false,
                    downloadCount: 10,
                },
            ],
        });

        const route = await import('../search/route');
        const response = await route.GET(new NextRequest('http://localhost/api/v1/extensions/open-vsx/search?query=python&offset=1&size=10'));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.success).toBe(true);
        expect(payload.data.query).toBe('python');
        expect(payload.data.extensions).toHaveLength(1);
        expect(payload.data.extensions[0].id).toBe('ms-python.python');
    });

    it('readme route returns markdown content', async () => {
        mockGetReadme.mockResolvedValue({
            readmeUrl: 'https://open-vsx.org/api/ms-python/python/latest/file/README.md',
            content: '# Python',
        });

        const route = await import('../[namespace]/[name]/readme/route');
        const response = await route.GET(
            new NextRequest('http://localhost/api/v1/extensions/open-vsx/ms-python/python/readme'),
            { params: Promise.resolve({ namespace: 'ms-python', name: 'python' }) },
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.success).toBe(true);
        expect(payload.data.content).toContain('# Python');
    });

    it('installs and uninstalls extension while reconciling local store', async () => {
        mockGetExtension.mockResolvedValue({
            id: 'ms-python.python',
            namespace: 'ms-python',
            name: 'python',
            version: '2026.4.0',
            displayName: 'Python',
            description: 'Python support',
            verified: true,
            deprecated: false,
            downloadCount: 1,
            files: {
                download: 'https://open-vsx.org/api/ms-python/python/2026.4.0/file/ms-python.python-2026.4.0.vsix',
                icon: 'https://open-vsx.org/api/ms-python/python/2026.4.0/file/icon.png',
            },
        });

        const installRoute = await import('../install/route');
        const installedRoute = await import('../installed/route');
        const uninstallRoute = await import('../uninstall/route');

        const installResponse = await installRoute.POST(new Request('http://localhost/api/v1/extensions/open-vsx/install', {
            method: 'POST',
            body: JSON.stringify({ namespace: 'ms-python', name: 'python' }),
            headers: { 'content-type': 'application/json' },
        }) as unknown as NextRequest);

        expect(installResponse.status).toBe(201);
        expect(mockDownloadVsix).toHaveBeenCalledTimes(1);
        expect(mockInstallVsix).toHaveBeenCalledTimes(1);

        const afterInstall = await installedRoute.GET(new NextRequest('http://localhost/api/v1/extensions/open-vsx/installed'));
        const afterInstallPayload = await afterInstall.json();
        expect(afterInstallPayload.data.extensions).toHaveLength(1);
        expect(afterInstallPayload.data.extensions[0].id).toBe('ms-python.python');

        const uninstallResponse = await uninstallRoute.POST(new Request('http://localhost/api/v1/extensions/open-vsx/uninstall', {
            method: 'POST',
            body: JSON.stringify({ id: 'ms-python.python' }),
            headers: { 'content-type': 'application/json' },
        }) as unknown as NextRequest);

        expect(uninstallResponse.status).toBe(200);
        expect(mockUninstallExtension).toHaveBeenCalledWith('ms-python.python');

        const afterUninstall = await installedRoute.GET(new NextRequest('http://localhost/api/v1/extensions/open-vsx/installed'));
        const afterUninstallPayload = await afterUninstall.json();
        expect(afterUninstallPayload.data.extensions).toHaveLength(0);
    });
});
