import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { DataSource } from 'typeorm';
import { NextRequest } from 'next/server';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Project } from '@/src/core/entities/Project';
import { Workspace } from '@/src/core/entities/Workspace';
import { User } from '@/src/core/entities/User';
import { WorkspaceMember } from '@/src/core/entities/WorkspaceMember';
import { ContextEntry } from '@/src/core/entities/ContextEntry';
import { Decision } from '@/src/core/entities/Decision';

const testWorkspaceId = '550e8400-e29b-41d4-a716-446655440000';
const testUserId = '00000000-0000-0000-0000-000000000001';

const { mockGetDb, mockGetWorkspaceId } = vi.hoisted(() => ({
    mockGetDb: vi.fn(),
    mockGetWorkspaceId: vi.fn(() => testWorkspaceId),
}));

vi.mock('@/app/api/_lib/db', () => ({
    getDb: mockGetDb,
}));

vi.mock('@/app/api/_lib/workspace', () => ({
    getWorkspaceId: mockGetWorkspaceId,
}));

// Import after mocking
import { POST } from '../route';

describe('POST /api/v1/projects', () => {
    let db: DataSource;
    let tempDir: string;

    beforeAll(async () => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kairos-test-'));
        db = new DataSource({
            type: 'sqlite',
            database: ':memory:',
            synchronize: true,
            logging: false,
            entities: [Project, Workspace, User, WorkspaceMember, ContextEntry, Decision],
        });
        await db.initialize();

        // Disable foreign key constraints for tests
        await db.query('PRAGMA foreign_keys = OFF');

        mockGetDb.mockImplementation(() => Promise.resolve(db));
    });

    afterAll(async () => {
        if (db?.isInitialized) {
            await db.destroy();
        }
        if (tempDir) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    beforeEach(async () => {
        // Clear all repositories
        const projectRepo = db.getRepository(Project);
        const workspaceRepo = db.getRepository(Workspace);
        const userRepo = db.getRepository(User);
        await projectRepo.clear();
        await workspaceRepo.clear();
        await userRepo.clear();

        // Create a user for the workspace owner with all required fields
        await userRepo.save({
            id: testUserId,
            email: 'test@example.com',
            passwordHash: 'hashed-password',
            fullName: 'Test User',
            status: 'active',
        });

        // Create a workspace for the tests
        await workspaceRepo.save({
            id: testWorkspaceId,
            name: 'Test Workspace',
            slug: 'test-workspace',
            ownerId: testUserId,
            status: 'active',
        });

        vi.clearAllMocks();
        mockGetWorkspaceId.mockReturnValue(testWorkspaceId);
    });

    describe('localPath handling', () => {
        it('should create project with metadata.localPath (nested)', async () => {
            const body = JSON.stringify({
                name: 'Test Project',
                metadata: { localPath: tempDir },
            });

            const req = new NextRequest('http://localhost/api/v1/projects', {
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            });

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(201);
            expect(data.success).toBe(true);
            expect(data.data.name).toBe('Test Project');
            expect(data.data.metadata?.localPath).toBe(tempDir);
        });

        it('should create project with top-level localPath (compat)', async () => {
            const body = JSON.stringify({
                name: 'Test Project 2',
                localPath: tempDir,
            });

            const req = new NextRequest('http://localhost/api/v1/projects', {
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            });

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(201);
            expect(data.success).toBe(true);
            expect(data.data.name).toBe('Test Project 2');
            expect(data.data.metadata?.localPath).toBe(tempDir);
        });

        it('should create project without .git and persist metadata.localPath', async () => {
            const body = JSON.stringify({
                name: 'Non-Git Project',
                metadata: { localPath: tempDir },
            });

            const req = new NextRequest('http://localhost/api/v1/projects', {
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            });

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(201);
            expect(data.success).toBe(true);
            expect(data.data.name).toBe('Non-Git Project');
            expect(data.data.metadata?.localPath).toBe(tempDir);
        });

        it('should return existing project for duplicate localPath', async () => {
            const body1 = JSON.stringify({
                name: 'Original Project',
                metadata: { localPath: tempDir },
            });

            const req1 = new NextRequest('http://localhost/api/v1/projects', {
                method: 'POST',
                body: body1,
                headers: { 'Content-Type': 'application/json' },
            });

            const res1 = await POST(req1);
            const data1 = await res1.json();
            expect(res1.status).toBe(201);

            // Try to create again with same localPath
            const body2 = JSON.stringify({
                name: 'Duplicate Project',
                metadata: { localPath: tempDir },
            });

            const req2 = new NextRequest('http://localhost/api/v1/projects', {
                method: 'POST',
                body: body2,
                headers: { 'Content-Type': 'application/json' },
            });

            const res2 = await POST(req2);
            const data2 = await res2.json();

            expect(res2.status).toBe(200);
            expect(data2.data.id).toBe(data1.data.id);
            expect(data2.data.name).toBe('Original Project');
        });

        it('should reject if name is missing', async () => {
            const body = JSON.stringify({
                metadata: { localPath: tempDir },
            });

            const req = new NextRequest('http://localhost/api/v1/projects', {
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            });

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.error.code).toBe('VALIDATION_ERROR');
        });

        it('should create project without localPath', async () => {
            const body = JSON.stringify({
                name: 'No Path Project',
            });

            const req = new NextRequest('http://localhost/api/v1/projects', {
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            });

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(201);
            expect(data.success).toBe(true);
            expect(data.data.name).toBe('No Path Project');
            expect(data.data.metadata).toBeNull();
        });
    });
});
