import type { EmbeddingStore, MessageEmbedding } from "./types"

export class LanceDBEmbeddingStore implements EmbeddingStore {
  private embeddings: Map<
    string,
    { embedding: number[]; metadata?: Record<string, unknown> }
  > = new Map()

  async storeEmbedding(
    messageId: string,
    embedding: number[],
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    this.embeddings.set(messageId, { embedding, metadata })
  }

  async searchSimilar(
    queryEmbedding: number[],
    limit = 10,
  ): Promise<MessageEmbedding[]> {
    const results: MessageEmbedding[] = []

    for (const [messageId, data] of this.embeddings.entries()) {
      const score = this.cosineSimilarity(queryEmbedding, data.embedding)
      results.push({
        messageId,
        embedding: data.embedding,
        score,
        metadata: data.metadata,
      })
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB)
    return denominator === 0 ? 0 : dotProduct / denominator
  }
}
