import { getDb } from '@/app/api/_lib/db';
import { ModelBenchmarkService } from '@/src/core/services/ModelBenchmarkService';
import { MetricsService } from '@/src/core/services/MetricsService';
import { SettingsService } from '@/src/core/services/SettingsService';
import { SelfOptimizationService } from '@/src/core/services/SelfOptimizationService';

let started = false;
let selfOptimizationService: SelfOptimizationService | null = null;

const metricsService = MetricsService.getInstance();
const benchmarkService = ModelBenchmarkService.getInstance(metricsService);

async function createSelfOptimizationService(): Promise<SelfOptimizationService> {
    if (selfOptimizationService) return selfOptimizationService;

    const db = await getDb();
    const settingsService = new SettingsService(db);
    const aiSettings = await settingsService.getAIProviderSettings('system');
    const intervalMs = typeof aiSettings['selfOptimization.intervalMs'] === 'number'
        ? aiSettings['selfOptimization.intervalMs']
        : 60 * 60_000;

    selfOptimizationService = SelfOptimizationService.getInstance({
        intervalMs,
    });

    return selfOptimizationService;
}

export async function ensureSelfOptimizationStarted(): Promise<void> {
    if (started) return;
    const service = await createSelfOptimizationService();
    await service.start();
    started = true;
}

export function getSelfOptimizationService(): SelfOptimizationService {
    if (!selfOptimizationService) {
        selfOptimizationService = SelfOptimizationService.getInstance();
    }
    return selfOptimizationService;
}

export { metricsService, benchmarkService };
