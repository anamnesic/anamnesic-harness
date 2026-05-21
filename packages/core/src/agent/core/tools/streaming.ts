import type { ToolContext, ToolResult, StreamingToolResult } from './types';

export interface StreamingOptions {
  chunkSize?: number;
  delayMs?: number;
}

export async function* streamTextResponse(
  text: string,
  options: StreamingOptions = {}
): AsyncGenerator<{ type: 'chunk'; content: string }> {
  const { chunkSize = 100, delayMs = 0 } = options;
  
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize);
    yield { type: 'chunk', content: chunk };
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

export async function* executeWithStreaming(
  ctx: ToolContext,
  input: unknown,
  executor: (ctx: ToolContext, input: unknown) => Promise<ToolResult>
): AsyncGenerator<{ type: 'chunk'; content: string } | { type: 'end'; result: ToolResult }> {
  const resultPromise = executor(ctx, input);
  
  // Yield initial chunk to indicate start
  yield { type: 'chunk', content: '' };
  
  const result = await resultPromise;
  
  if (result.output) {
    yield { type: 'chunk', content: result.output };
  }
  
  yield { type: 'end', result };
}

export function streamToReadableStream(
  generator: AsyncGenerator<{ type: 'chunk'; content: string } | { type: 'end'; result: ToolResult }>
): ReadableStream {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const item of generator) {
          if (item.type === 'chunk') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: item.content })}\n\n`)
            );
          } else {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'end', result: item.result })}\n\n`)
            );
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });
}
