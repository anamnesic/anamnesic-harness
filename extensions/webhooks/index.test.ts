import { createTestPluginApi } from "kairos/plugin-sdk/plugin-test-api";
import { describe, expect, it, vi } from "vitest";
import type { kairosPluginApi } from "./api.js";
import plugin from "./index.js";

function createApi(params?: {
  pluginConfig?: kairosPluginApi["pluginConfig"];
  registerHttpRoute?: kairosPluginApi["registerHttpRoute"];
  logger?: kairosPluginApi["logger"];
}): kairosPluginApi {
  return createTestPluginApi({
    id: "webhooks",
    name: "Webhooks",
    source: "test",
    pluginConfig: params?.pluginConfig ?? {},
    runtime: {
      tasks: {
        managedFlows: {
          bindSession: vi.fn(({ sessionKey }: { sessionKey: string }) => ({ sessionKey })),
        },
      },
    } as unknown as kairosPluginApi["runtime"],
    registerHttpRoute: params?.registerHttpRoute ?? vi.fn(),
    logger:
      params?.logger ??
      ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      } as kairosPluginApi["logger"]),
  });
}

describe("webhooks plugin registration", () => {
  it("registers SecretRef-backed routes synchronously", () => {
    const registerHttpRoute = vi.fn();

    const result = plugin.register(
      createApi({
        pluginConfig: {
          routes: {
            zapier: {
              sessionKey: "agent:main:main",
              secret: {
                source: "env",
                provider: "default",
                id: "kairos_WEBHOOK_SECRET",
              },
            },
          },
        },
        registerHttpRoute,
      }),
    );

    expect(result).toBeUndefined();
    expect(registerHttpRoute).toHaveBeenCalledTimes(1);
    expect(registerHttpRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/plugins/webhooks/zapier",
        auth: "plugin",
        match: "exact",
        replaceExisting: true,
      }),
    );
  });
});
