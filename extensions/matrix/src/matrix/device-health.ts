export type MatrixManagedDeviceInfo = {
  deviceId: string;
  displayName: string | null;
  current: boolean;
};

export type MatrixDeviceHealthSummary = {
  currentDeviceId: string | null;
  stalekairosDevices: MatrixManagedDeviceInfo[];
  currentkairosDevices: MatrixManagedDeviceInfo[];
};

const kairos_DEVICE_NAME_PREFIX = "kairos ";

export function iskairosManagedMatrixDevice(displayName: string | null | undefined): boolean {
  return displayName?.startsWith(kairos_DEVICE_NAME_PREFIX) === true;
}

export function summarizeMatrixDeviceHealth(
  devices: MatrixManagedDeviceInfo[],
): MatrixDeviceHealthSummary {
  const currentDeviceId = devices.find((device) => device.current)?.deviceId ?? null;
  const kairosDevices = devices.filter((device) =>
    iskairosManagedMatrixDevice(device.displayName),
  );
  return {
    currentDeviceId,
    stalekairosDevices: kairosDevices.filter((device) => !device.current),
    currentkairosDevices: kairosDevices.filter((device) => device.current),
  };
}
