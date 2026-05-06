import path from "node:path";
import { loadRuntimeApiExportTypesViaJiti } from "kairos/plugin-sdk/plugin-test-contracts";
import { describe, expect, it } from "vitest";

describe("zalo runtime api", () => {
  it("loads the narrow runtime api without reentering setup surfaces", () => {
    const runtimeApiPath = path.join(process.cwd(), "extensions", "zalo", "runtime-api.ts");

    expect(
      loadRuntimeApiExportTypesViaJiti({
        modulePath: runtimeApiPath,
        exportNames: ["setZaloRuntime"],
        realPluginSdkSpecifiers: ["kairos/plugin-sdk/runtime-store"],
      }),
    ).toEqual({
      setZaloRuntime: "function",
    });
  });
});
