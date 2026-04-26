import { BenchmarkInterpretationService } from '@/src/core/services/BenchmarkInterpretationService';

const benchmarkInterpretationService = BenchmarkInterpretationService.getInstance();

export function getBenchmarkInterpretationService(): BenchmarkInterpretationService {
    return benchmarkInterpretationService;
}
