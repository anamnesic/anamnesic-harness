export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspaceId') || 'system';
        
        const db = await getDb();
        const { SettingsService } = await import('@/src/core/services/SettingsService');
        const settingsService = new SettingsService(db);
        
        // Get feature flags for the workspace
        const flags = await settingsService.getFeatureFlags(workspaceId);
        
        // Get AI provider settings
        const aiSettings = await settingsService.getAIProviderSettings(workspaceId);
        
        return ok({ 
            flags,
            aiSettings,
            workspaceId 
        });
    } catch (error) {
        console.error('Settings GET error:', error);
        return err('INTERNAL_ERROR', 'Failed to read settings', 500);
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { workspaceId = 'system', flags, aiSettings } = body;
        
        const db = await getDb();
        const { SettingsService } = await import('@/src/core/services/SettingsService');
        const settingsService = new SettingsService(db);
        
        // Update feature flags if provided
        if (flags && typeof flags === 'object') {
            for (const [key, value] of Object.entries(flags)) {
                if (typeof value === 'boolean') {
                    await settingsService.setFeatureFlag(workspaceId, key as any, value);
                }
            }
        }
        
        // Update AI provider settings if provided
        if (aiSettings && typeof aiSettings === 'object') {
            for (const [key, value] of Object.entries(aiSettings)) {
                // Parse provider.setting format
                const [provider, ...settingParts] = key.split('.');
                const settingKey = settingParts.join('.');
                
                if (provider && settingKey) {
                    const type = typeof value === 'boolean' ? 'boolean' : 
                                typeof value === 'number' ? 'number' : 
                                typeof value === 'object' ? 'json' : 'string';
                    
                    await settingsService.setAIProviderSetting(
                        workspaceId,
                        provider,
                        settingKey,
                        value,
                        type
                    );
                }
            }
        }
        
        // Return updated settings
        const updatedFlags = await settingsService.getFeatureFlags(workspaceId);
        const updatedAiSettings = await settingsService.getAIProviderSettings(workspaceId);
        
        return ok({ 
            flags: updatedFlags,
            aiSettings: updatedAiSettings,
            workspaceId 
        });
    } catch (error) {
        console.error('Settings PATCH error:', error);
        return err('INTERNAL_ERROR', 'Failed to update settings', 500);
    }
}
