import { deepMerge } from "./merge"
import type {
  ConfigOptions,
  ConfigSource,
  ConfigChangeListener,
  DeepPartial,
} from "./types"

export class ConfigManager<T extends Record<string, unknown>> {
  private config: T
  private readonly options: ConfigOptions<T>
  private listeners: Set<ConfigChangeListener<T>> = new Set()
  private cleanupFns: (() => void)[] = []
  private retryCount = 0

  constructor(options: ConfigOptions<T>) {
    this.options = options
    this.config = this.loadConfig()
    this.setupWatchers()
  }

  private loadConfig(): T {
    const { defaultConfig, sources, recovery } = this.options
    let merged = { ...defaultConfig }

    if (sources && sources.length > 0) {
      const sorted = [...sources].sort((a, b) => b.priority - a.priority)

      for (const source of sorted) {
        try {
          const loaded = source.load()
          merged = deepMerge(merged, loaded as DeepPartial<T>)
          this.retryCount = 0
        } catch (err) {
          if (recovery && this.retryCount < recovery.maxRetries) {
            this.retryCount++
            merged = deepMerge(merged, recovery.fallbackConfig as DeepPartial<T>)
          }
        }
      }
    }

    return merged as T
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.config[key]
  }

  getAll(): Readonly<T> {
    return Object.freeze({ ...this.config })
  }

  update(partial: DeepPartial<T>): void {
    const previous = { ...this.config }
    this.config = deepMerge(this.config, partial)
    this.notifyListeners(this.config, previous)
  }

  reload(): void {
    const previous = { ...this.config }
    this.config = this.loadConfig()
    this.notifyListeners(this.config, previous)
  }

  private setupWatchers(): void {
    if (!this.options.hotReload || !this.options.sources) return

    for (const source of this.options.sources) {
      if (source.watch) {
        const cleanup = source.watch(() => this.reload())
        this.cleanupFns.push(cleanup)
      }
    }
  }

  onChange(listener: ConfigChangeListener<T>): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(config: T, previous: T): void {
    for (const listener of this.listeners) {
      listener(config, previous)
    }
  }

  destroy(): void {
    this.cleanupFns.forEach((fn) => fn())
    this.cleanupFns = []
    this.listeners.clear()
  }
}
