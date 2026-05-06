import { CliInferenceService, CliTaskQueue } from '@/src/core/llm-cli';

const inferenceService = new CliInferenceService();
const taskQueue = new CliTaskQueue(inferenceService, { concurrency: 2 });

export function getCliInferenceService(): CliInferenceService {
    return inferenceService;
}

export function getCliTaskQueue(): CliTaskQueue {
    return taskQueue;
}
