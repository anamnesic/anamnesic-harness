import Foundation
import kairosKit
import Testing
@testable import kairos

struct MacNodeModeCoordinatorTests {
    @Test func `remote mode does not advertise browser proxy`() {
        let caps = MacNodeModeCoordinator.resolvedCaps(
            browserControlEnabled: true,
            cameraEnabled: false,
            locationMode: .off,
            connectionMode: .remote)
        let commands = MacNodeModeCoordinator.resolvedCommands(caps: caps)

        #expect(!caps.contains(kairosCapability.browser.rawValue))
        #expect(!commands.contains(kairosBrowserCommand.proxy.rawValue))
        #expect(commands.contains(kairosCanvasCommand.present.rawValue))
        #expect(commands.contains(kairosSystemCommand.notify.rawValue))
    }

    @Test func `local mode advertises browser proxy when enabled`() {
        let caps = MacNodeModeCoordinator.resolvedCaps(
            browserControlEnabled: true,
            cameraEnabled: false,
            locationMode: .off,
            connectionMode: .local)
        let commands = MacNodeModeCoordinator.resolvedCommands(caps: caps)

        #expect(caps.contains(kairosCapability.browser.rawValue))
        #expect(commands.contains(kairosBrowserCommand.proxy.rawValue))
    }
}
