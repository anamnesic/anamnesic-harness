import { createSignal } from "solid-js"

const model = {
  id: "kairos-3-7-orange",
  name: "kairos 3.7 orange",
  provider: { id: "anthropic" },
  variants: { fast: {}, thinking: {} },
}

const agents = [{ name: "build" }, { name: "review" }, { name: "plan" }]

const [agent, setAgent] = createSignal(agents[0].name)
const [variant, setVariant] = createSignal<string | undefined>(undefined)

export function useLocal() {
  return {
    slug: () => "c3Rvcnk=",
    agent: {
      list: () => agents,
      current: () => agents.find((item) => item.name === agent()) ?? agents[0],
      set(value?: string) {
        if (!value) {
          setAgent(agents[0].name)
          return
        }
        const hit = agents.find((item) => item.name === value)
        setAgent(hit?.name ?? agents[0].name)
      },
    },
    model: {
      current: () => model,
      variant: {
        list: () => Object.keys(model.variants),
        current: () => variant(),
        set(next?: string) {
          setVariant(next)
        },
      },
    },
  }
}
