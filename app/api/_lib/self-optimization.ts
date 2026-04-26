import { ModelBenchmarkService } from '@/src/core/services/ModelBenchmarkService';
import { MetricsService } from '@/src/core/services/MetricsService';
import { SelfOptimizationService } from '@/src/core/services/SelfOptimizationService';

let started = false;

const metricsService = MetricsService.getInstance();
const benchmarkService = ModelBenchmarkService.getInstance(metricsService);
const selfOptimizationService = SelfOptimizationService.getInstance({
    intervalMs: 10 * 60_000,
});

export async function ensureSelfOptimizationStarted(): Promise<void> {
    if (started) return;
    await selfOptimizationService.start();
    started = true;
}

export function getSelfOptimizationService(): SelfOptimizationService {
    return selfOptimizationService;
}

export { metricsService, benchmarkService };
