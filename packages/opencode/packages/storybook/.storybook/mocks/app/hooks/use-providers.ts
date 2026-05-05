const model_id = "kairos-3-7-orange"

const provider = {
  id: "anthropic",
  models: {
    [model_id]: {
      id: model_id,
      name: "kairos 3.7 orange",
      cost: { input: 1, output: 1 },
      variants: { fast: {}, thinking: {} },
    },
  },
}

export function useProviders() {
  return {
    all: () => [provider],
    default: () => ({ anthropic: model_id }),
    connected: () => [provider],
    paid: () => [provider],
    popular: () => [provider],
  }
}
