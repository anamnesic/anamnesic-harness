export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Array<DeepPartial<T> | undefined | null>
): T {
  const result = { ...target }

  for (const source of sources) {
    if (!source) continue
    mergeInto(result, source)
  }

  return result
}

function mergeInto(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    const sourceValue = source[key]
    const targetValue = target[key]

    if (
      sourceValue !== null &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      mergeInto(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>)
    } else if (sourceValue !== undefined) {
      target[key] = sourceValue
    }
  }
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends string | number | boolean | null | undefined
    ? T[P]
    : T[P] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : DeepPartial<T[P]>
}
