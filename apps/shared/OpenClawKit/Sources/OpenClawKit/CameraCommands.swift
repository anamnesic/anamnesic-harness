import Foundation

public enum kairosCameraCommand: String, Codable, Sendable {
    case list = "camera.list"
    case snap = "camera.snap"
    case clip = "camera.clip"
}

public enum kairosCameraFacing: String, Codable, Sendable {
    case back
    case front
}

public enum kairosCameraImageFormat: String, Codable, Sendable {
    case jpg
    case jpeg
}

public enum kairosCameraVideoFormat: String, Codable, Sendable {
    case mp4
}

public struct kairosCameraSnapParams: Codable, Sendable, Equatable {
    public var facing: kairosCameraFacing?
    public var maxWidth: Int?
    public var quality: Double?
    public var format: kairosCameraImageFormat?
    public var deviceId: String?
    public var delayMs: Int?

    public init(
        facing: kairosCameraFacing? = nil,
        maxWidth: Int? = nil,
        quality: Double? = nil,
        format: kairosCameraImageFormat? = nil,
        deviceId: String? = nil,
        delayMs: Int? = nil)
    {
        self.facing = facing
        self.maxWidth = maxWidth
        self.quality = quality
        self.format = format
        self.deviceId = deviceId
        self.delayMs = delayMs
    }
}

public struct kairosCameraClipParams: Codable, Sendable, Equatable {
    public var facing: kairosCameraFacing?
    public var durationMs: Int?
    public var includeAudio: Bool?
    public var format: kairosCameraVideoFormat?
    public var deviceId: String?

    public init(
        facing: kairosCameraFacing? = nil,
        durationMs: Int? = nil,
        includeAudio: Bool? = nil,
        format: kairosCameraVideoFormat? = nil,
        deviceId: String? = nil)
    {
        self.facing = facing
        self.durationMs = durationMs
        self.includeAudio = includeAudio
        self.format = format
        self.deviceId = deviceId
    }
}
