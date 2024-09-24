export const embeddingToString = (embedding: number[]) => {
  return embedding.map((e) => e.toFixed(2)).join(', ')
}
