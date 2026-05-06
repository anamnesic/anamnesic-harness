import { describe, expect, it } from "vitest";
import { iskairosManagedMatrixDevice, summarizeMatrixDeviceHealth } from "./device-health.js";

describe("matrix device health", () => {
  it("detects kairos-managed device names", () => {
    expect(iskairosManagedMatrixDevice("kairos Gateway")).toBe(true);
    expect(iskairosManagedMatrixDevice("kairos Debug")).toBe(true);
    expect(iskairosManagedMatrixDevice("Element iPhone")).toBe(false);
    expect(iskairosManagedMatrixDevice(null)).toBe(false);
  });

  it("summarizes stale kairos-managed devices separately from the current device", () => {
    const summary = summarizeMatrixDeviceHealth([
      {
        deviceId: "du314Zpw3A",
        displayName: "kairos Gateway",
        current: true,
      },
      {
        deviceId: "BritdXC6iL",
        displayName: "kairos Gateway",
        current: false,
      },
      {
        deviceId: "G6NJU9cTgs",
        displayName: "kairos Debug",
        current: false,
      },
      {
        deviceId: "phone123",
        displayName: "Element iPhone",
        current: false,
      },
    ]);

    expect(summary.currentDeviceId).toBe("du314Zpw3A");
    expect(summary.currentkairosDevices).toEqual([
      expect.objectContaining({ deviceId: "du314Zpw3A" }),
    ]);
    expect(summary.stalekairosDevices).toEqual([
      expect.objectContaining({ deviceId: "BritdXC6iL" }),
      expect.objectContaining({ deviceId: "G6NJU9cTgs" }),
    ]);
  });
});
