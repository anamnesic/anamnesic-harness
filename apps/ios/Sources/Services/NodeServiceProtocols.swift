import CoreLocation
import Foundation
import kairosKit
import UIKit

typealias kairosCameraSnapResult = (format: String, base64: String, width: Int, height: Int)
typealias kairosCameraClipResult = (format: String, base64: String, durationMs: Int, hasAudio: Bool)

protocol CameraServicing: Sendable {
    func listDevices() async -> [CameraController.CameraDeviceInfo]
    func snap(params: kairosCameraSnapParams) async throws -> kairosCameraSnapResult
    func clip(params: kairosCameraClipParams) async throws -> kairosCameraClipResult
}

protocol ScreenRecordingServicing: Sendable {
    func record(
        screenIndex: Int?,
        durationMs: Int?,
        fps: Double?,
        includeAudio: Bool?,
        outPath: String?) async throws -> String
}

@MainActor
protocol LocationServicing: Sendable {
    func authorizationStatus() -> CLAuthorizationStatus
    func accuracyAuthorization() -> CLAccuracyAuthorization
    func ensureAuthorization(mode: kairosLocationMode) async -> CLAuthorizationStatus
    func currentLocation(
        params: kairosLocationGetParams,
        desiredAccuracy: kairosLocationAccuracy,
        maxAgeMs: Int?,
        timeoutMs: Int?) async throws -> CLLocation
    func startLocationUpdates(
        desiredAccuracy: kairosLocationAccuracy,
        significantChangesOnly: Bool) -> AsyncStream<CLLocation>
    func stopLocationUpdates()
    func startMonitoringSignificantLocationChanges(onUpdate: @escaping @Sendable (CLLocation) -> Void)
    func stopMonitoringSignificantLocationChanges()
}

@MainActor
protocol DeviceStatusServicing: Sendable {
    func status() async throws -> kairosDeviceStatusPayload
    func info() -> kairosDeviceInfoPayload
}

protocol PhotosServicing: Sendable {
    func latest(params: kairosPhotosLatestParams) async throws -> kairosPhotosLatestPayload
}

protocol ContactsServicing: Sendable {
    func search(params: kairosContactsSearchParams) async throws -> kairosContactsSearchPayload
    func add(params: kairosContactsAddParams) async throws -> kairosContactsAddPayload
}

protocol CalendarServicing: Sendable {
    func events(params: kairosCalendarEventsParams) async throws -> kairosCalendarEventsPayload
    func add(params: kairosCalendarAddParams) async throws -> kairosCalendarAddPayload
}

protocol RemindersServicing: Sendable {
    func list(params: kairosRemindersListParams) async throws -> kairosRemindersListPayload
    func add(params: kairosRemindersAddParams) async throws -> kairosRemindersAddPayload
}

protocol MotionServicing: Sendable {
    func activities(params: kairosMotionActivityParams) async throws -> kairosMotionActivityPayload
    func pedometer(params: kairosPedometerParams) async throws -> kairosPedometerPayload
}

struct WatchMessagingStatus: Equatable {
    var supported: Bool
    var paired: Bool
    var appInstalled: Bool
    var reachable: Bool
    var activationState: String
}

struct WatchQuickReplyEvent: Equatable {
    var replyId: String
    var promptId: String
    var actionId: String
    var actionLabel: String?
    var sessionKey: String?
    var note: String?
    var sentAtMs: Int?
    var transport: String
}

struct WatchExecApprovalResolveEvent: Equatable {
    var replyId: String
    var approvalId: String
    var decision: kairosWatchExecApprovalDecision
    var sentAtMs: Int?
    var transport: String
}

struct WatchExecApprovalSnapshotRequestEvent: Equatable {
    var requestId: String
    var sentAtMs: Int?
    var transport: String
}

struct WatchNotificationSendResult: Equatable {
    var deliveredImmediately: Bool
    var queuedForDelivery: Bool
    var transport: String
}

protocol WatchMessagingServicing: AnyObject, Sendable {
    func status() async -> WatchMessagingStatus
    func setStatusHandler(_ handler: (@Sendable (WatchMessagingStatus) -> Void)?)
    func setReplyHandler(_ handler: (@Sendable (WatchQuickReplyEvent) -> Void)?)
    func setExecApprovalResolveHandler(_ handler: (@Sendable (WatchExecApprovalResolveEvent) -> Void)?)
    func setExecApprovalSnapshotRequestHandler(
        _ handler: (@Sendable (WatchExecApprovalSnapshotRequestEvent) -> Void)?)
    func sendNotification(
        id: String,
        params: kairosWatchNotifyParams) async throws -> WatchNotificationSendResult
    func sendExecApprovalPrompt(
        _ message: kairosWatchExecApprovalPromptMessage) async throws -> WatchNotificationSendResult
    func sendExecApprovalResolved(
        _ message: kairosWatchExecApprovalResolvedMessage) async throws -> WatchNotificationSendResult
    func sendExecApprovalExpired(
        _ message: kairosWatchExecApprovalExpiredMessage) async throws -> WatchNotificationSendResult
    func syncExecApprovalSnapshot(
        _ message: kairosWatchExecApprovalSnapshotMessage) async throws -> WatchNotificationSendResult
}

extension CameraController: CameraServicing {}
extension ScreenRecordService: ScreenRecordingServicing {}
extension LocationService: LocationServicing {}
