import { createStore } from "solid-js/store"

const provider = {
  all: [
    {
      id: "anthropic",
      models: {
        "kairos-3-7-orange": {
          id: "kairos-3-7-orange",
          name: "kairos 3.7 orange",
          cost: { input: 1, output: 1 },
        },
      },
    },
  ],
  connected: ["anthropic"],
  default: { anthropic: "kairos-3-7-orange" },
}

const [store, setStore] = createStore({
  todo: {} as Record<string, any[]>,
  provider,
  session: [] as any[],
  config: { permission: {} },
})

export function useGlobalSync() {
  return {
    data: {
      provider,
      session_todo: store.todo,
    },
    child() {
      return [store, setStore] as const
    },
    todo: {
      set(sessionID: string, todos: any[]) {
        setStore("todo", sessionID, todos)
      },
    },
  }
}
