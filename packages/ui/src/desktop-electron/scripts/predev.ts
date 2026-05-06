import { $ } from "bun"

await $`bun ./scripts/copy-icons.ts ${process.env.KAIROS_CHANNEL ?? "dev"}`

await $`cd ../kairos && bun script/build-node.ts`
