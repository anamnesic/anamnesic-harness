import Foundation

public enum kairosLocationMode: String, Codable, Sendable, CaseIterable {
    case off
    case whileUsing
    case always
}
