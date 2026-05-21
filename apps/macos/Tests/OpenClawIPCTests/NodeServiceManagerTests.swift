import Foundation
import Testing
@testable import kairos

@Suite(.serialized) struct NodeServiceManagerTests {
    @Test func `builds node service commands with current CLI shape`() async throws {
        try await TestIsolation.withUserDefaultsValues(["kairos.gatewayProjectRootPath": nil]) {
            let tmp = try makeTempDirForTests()
            CommandResolver.setProjectRoot(tmp.path)

            let kairosPath = tmp.appendingPathComponent("node_modules/.bin/kairos")
            try makeExecutableForTests(at: kairosPath)

            let start = NodeServiceManager._testServiceCommand(["start"])
            #expect(start == [kairosPath.path, "node", "start", "--json"])

            let stop = NodeServiceManager._testServiceCommand(["stop"])
            #expect(stop == [kairosPath.path, "node", "stop", "--json"])
        }
    }
}
