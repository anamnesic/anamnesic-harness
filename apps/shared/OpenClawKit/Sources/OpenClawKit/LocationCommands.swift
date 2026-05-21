import Foundation

public enum kairosLocationCommand: String, Codable, Sendable {
    case get = "location.get"
}

public enum kairosLocationAccuracy: String, Codable, Sendable {
    case coarse
    case balanced
    case precise
}

public struct kairosLocationGetParams: Codable, Sendable, Equatable {
    public var timeoutMs: Int?
    public var maxAgeMs: Int?
    public var desiredAccuracy: kairosLocationAccuracy?

    public init(timeoutMs: Int? = nil, maxAgeMs: Int? = nil, desiredAccuracy: kairosLocationAccuracy? = nil) {
        self.timeoutMs = timeoutMs
        self.maxAgeMs = maxAgeMs
        self.desiredAccuracy = desiredAccuracy
    }
}

public struct kairosLocationPayload: Codable, Sendable, Equatable {
    public var lat: Double
    public var lon: Double
    public var accuracyMeters: Double
    public var altitudeMeters: Double?
    public var speedMps: Double?
    public var headingDeg: Double?
    public var timestamp: String
    public var isPrecise: Bool
    public var source: String?

    public init(
        lat: Double,
        lon: Double,
        accuracyMeters: Double,
        altitudeMeters: Double? = nil,
        speedMps: Double? = nil,
        headingDeg: Double? = nil,
        timestamp: String,
        isPrecise: Bool,
        source: String? = nil)
    {
        self.lat = lat
        self.lon = lon
        self.accuracyMeters = accuracyMeters
        self.altitudeMeters = altitudeMeters
        self.speedMps = speedMps
        self.headingDeg = headingDeg
        self.timestamp = timestamp
        self.isPrecise = isPrecise
        self.source = source
    }
}
