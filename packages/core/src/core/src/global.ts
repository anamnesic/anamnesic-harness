import path from "path"
import fs from "fs/promises"
import os from "os"
import { Context, Effect, Layer } from "effect"
import { Flock } from "./util/flock"

const homeDir = () => process.env.KAIROS_TEST_HOME ?? os.homedir()
const kairosRoot = path.join(homeDir(), ".kairos")

const paths = {
  get home() {
    return process.env.KAIROS_TEST_HOME ?? os.homedir()
  },
  data: kairosRoot,
  bin: path.join(kairosRoot, "bin"),
  log: path.join(kairosRoot, "log"),
  cache: kairosRoot,
  config: kairosRoot,
  state: kairosRoot,
}

export const Path = paths

Flock.setGlobal({ state: kairosRoot })

await Promise.all([
  fs.mkdir(Path.data, { recursive: true }),
  fs.mkdir(Path.config, { recursive: true }),
  fs.mkdir(Path.state, { recursive: true }),
  fs.mkdir(Path.log, { recursive: true }),
  fs.mkdir(Path.bin, { recursive: true }),
  fs.mkdir(path.join(kairosRoot, "repos"), { recursive: true }),
  fs.mkdir(path.join(kairosRoot, "tools"), { recursive: true }),
  fs.mkdir(path.join(kairosRoot, "memories"), { recursive: true }),
  fs.mkdir(path.join(kairosRoot, "skills"), { recursive: true }),
  fs.mkdir(path.join(kairosRoot, "plugins"), { recursive: true }),
  fs.mkdir(path.join(kairosRoot, "mcps"), { recursive: true }),
])

export class Service extends Context.Service<Service, Interface>()("@kairos/Global") {}

export interface Interface {
  readonly home: string
  readonly data: string
  readonly cache: string
  readonly config: string
  readonly state: string
  readonly bin: string
  readonly log: string
}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({
      home: Path.home,
      data: Path.data,
      cache: Path.cache,
      config: Path.config,
      state: Path.state,
      bin: Path.bin,
      log: Path.log,
    })
  }),
)

export * as Global from "./global"
