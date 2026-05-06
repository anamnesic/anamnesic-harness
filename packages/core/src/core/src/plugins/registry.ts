import type {
  PluginManifest,
  PluginInstance,
  PluginRegistry,
  PluginContext,
} from "./types"
import { readFile, readdir } from "fs/promises"
import { join, resolve } from "path"
import { existsSync } from "fs"

export class CorePluginRegistry implements PluginRegistry {
  private plugins: Map<string, PluginInstance> = new Map()
  private contexts: Map<string, PluginContext> = new Map()

  async discover(paths: string[]): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = []

    for (const basePath of paths) {
      if (!existsSync(basePath)) continue

      try {
        const entries = await readdir(basePath, { withFileTypes: true })

        for (const entry of entries) {
          if (!entry.isDirectory()) continue

          const manifestPath = join(basePath, entry.name, "manifest.json")
          if (!existsSync(manifestPath)) continue

          try {
            const content = await readFile(manifestPath, "utf-8")
            const manifest = JSON.parse(content) as PluginManifest
            manifests.push(manifest)
          } catch {
            // Invalid manifest, skip
          }
        }
      } catch {
        // Path not accessible, skip
      }
    }

    return manifests
  }

  async load(manifest: PluginManifest): Promise<PluginInstance> {
    if (this.plugins.has(manifest.name)) {
      throw new Error(`Plugin ${manifest.name} is already loaded`)
    }

    try {
      const instance = await this.createInstance(manifest)
      this.plugins.set(manifest.name, instance)

      if (manifest.autoStart) {
        const context = this.createContext(manifest)
        await instance.start(context)
      }

      return instance
    } catch (err) {
      throw new Error(
        `Failed to load plugin ${manifest.name}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async unload(name: string): Promise<void> {
    const instance = this.plugins.get(name)
    if (!instance) return

    try {
      if (instance.isRunning()) {
        await instance.stop()
      }
    } catch {
      // Ignore stop errors
    }

    this.plugins.delete(name)
    this.contexts.delete(name)
  }

  get(name: string): PluginInstance | undefined {
    return this.plugins.get(name)
  }

  list(): PluginInstance[] {
    return Array.from(this.plugins.values())
  }

  private async createInstance(
    manifest: PluginManifest,
  ): Promise<PluginInstance> {
    const pluginPath = manifest.local ?? manifest.npm
    if (!pluginPath) {
      throw new Error("Plugin has no local or npm path")
    }

    const mainPath = resolve(pluginPath, manifest.main)

    let pluginModule: any
    try {
      pluginModule = await import(mainPath)
    } catch {
      throw new Error(`Cannot load plugin module: ${mainPath}`)
    }

    const PluginClass = pluginModule.default ?? pluginModule
    if (typeof PluginClass !== "function") {
      throw new Error("Plugin module does not export a constructor")
    }

    return new PluginClass(manifest)
  }

  private createContext(manifest: PluginManifest): PluginContext {
    const context: PluginContext = {
      config: {},
      workingDirectory: process.cwd(),
      tempDir: "/tmp/kairos",
      logger: {
        info: (msg) => console.log(`[${manifest.name}] ${msg}`),
        warn: (msg) => console.warn(`[${manifest.name}] ${msg}`),
        error: (msg) => console.error(`[${manifest.name}] ${msg}`),
        debug: (msg) => console.debug(`[${manifest.name}] ${msg}`),
      },
    }

    this.contexts.set(manifest.name, context)
    return context
  }
}
