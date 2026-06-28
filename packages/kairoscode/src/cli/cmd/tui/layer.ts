import { Layer } from "effect"
import { TuiConfig } from "./config/tui"
import { Npm } from "@kairos/core/npm"
import { Observability } from "@kairos/core/effect/observability"

export const CliLayer = Observability.layer.pipe(Layer.merge(TuiConfig.layer), Layer.provide(Npm.defaultLayer))
