export type Primitive = string | number | boolean | null | undefined

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Primitive
    ? T[P]
    : T[P] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : DeepPartial<T[P]>
}

export interface ConfigSource {
  priority: number
  load(): Record<string, unknown>
  watch?(onChange: () => void): () => void
}

export interface ConfigOptions<T> {
  defaultConfig: T
  sources?: ConfigSource[]
  hotReload?: boolean
  recovery?: {
    maxRetries: number
    fallbackConfig: T
  }
}

export type ConfigChangeListener<T> = (config: T, previous: T) => void
