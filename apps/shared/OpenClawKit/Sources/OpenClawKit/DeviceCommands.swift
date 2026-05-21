import Foundation

public enum kairosDeviceCommand: String, Codable, Sendable {
    case status = "device.status"
    case info = "device.info"
}

public enum kairosBatteryState: String, Codable, Sendable {
    case unknown
    case unplugged
    case charging
    case full
}

public enum kairosThermalState: String, Codable, Sendable {
    case nominal
    case fair
    case serious
    case critical
}

public enum kairosNetworkPathStatus: String, Codable, Sendable {
    case satisfied
    case unsatisfied
    case requiresConnection
}

public enum kairosNetworkInterfaceType: String, Codable, Sendable {
    case wifi
    case cellular
    case wired
    case other
}

public struct kairosBatteryStatusPayload: Codable, Sendable, Equatable {
    public var level: Double?
    public var state: kairosBatteryState
    public var lowPowerModeEnabled: Bool

    public init(level: Double?, state: kairosBatteryState, lowPowerModeEnabled: Bool) {
        self.level = level
        self.state = state
        self.lowPowerModeEnabled = lowPowerModeEnabled
    }
}

public struct kairosThermalStatusPayload: Codable, Sendable, Equatable {
    public var state: kairosThermalState

    public init(state: kairosThermalState) {
        self.state = state
    }
}

public struct kairosStorageStatusPayload: Codable, Sendable, Equatable {
    public var totalBytes: Int64
    public var freeBytes: Int64
    public var usedBytes: Int64

    public init(totalBytes: Int64, freeBytes: Int64, usedBytes: Int64) {
        self.totalBytes = totalBytes
        self.freeBytes = freeBytes
        self.usedBytes = usedBytes
    }
}

public struct kairosNetworkStatusPayload: Codable, Sendable, Equatable {
    public var status: kairosNetworkPathStatus
    public var isExpensive: Bool
    public var isConstrained: Bool
    public var interfaces: [kairosNetworkInterfaceType]

    public init(
        status: kairosNetworkPathStatus,
        isExpensive: Bool,
        isConstrained: Bool,
        interfaces: [kairosNetworkInterfaceType])
    {
        self.status = status
        self.isExpensive = isExpensive
        self.isConstrained = isConstrained
        self.interfaces = interfaces
    }
}

public struct kairosDeviceStatusPayload: Codable, Sendable, Equatable {
    public var battery: kairosBatteryStatusPayload
    public var thermal: kairosThermalStatusPayload
    public var storage: kairosStorageStatusPayload
    public var network: kairosNetworkStatusPayload
    public var uptimeSeconds: Double

    public init(
        battery: kairosBatteryStatusPayload,
        thermal: kairosThermalStatusPayload,
        storage: kairosStorageStatusPayload,
        network: kairosNetworkStatusPayload,
        uptimeSeconds: Double)
    {
        self.battery = battery
        self.thermal = thermal
        self.storage = storage
        self.network = network
        self.uptimeSeconds = uptimeSeconds
    }
}

public struct kairosDeviceInfoPayload: Codable, Sendable, Equatable {
    public var deviceName: String
    public var modelIdentifier: String
    public var systemName: String
    public var systemVersion: String
    public var appVersion: String
    public var appBuild: String
    public var locale: String

    public init(
        deviceName: String,
        modelIdentifier: String,
        systemName: String,
        systemVersion: String,
        appVersion: String,
        appBuild: String,
        locale: String)
    {
        self.deviceName = deviceName
        self.modelIdentifier = modelIdentifier
        self.systemName = systemName
        self.systemVersion = systemVersion
        self.appVersion = appVersion
        self.appBuild = appBuild
        self.locale = locale
    }
}
