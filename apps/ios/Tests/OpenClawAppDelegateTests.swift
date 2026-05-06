import Testing
@testable import kairos

@Suite(.serialized) struct kairosAppDelegateTests {
    @Test @MainActor func resolvesRegistryModelBeforeViewTaskAssignsDelegateModel() {
        let registryModel = NodeAppModel()
        kairosAppModelRegistry.appModel = registryModel
        defer { kairosAppModelRegistry.appModel = nil }

        let delegate = kairosAppDelegate()

        #expect(delegate._test_resolvedAppModel() === registryModel)
    }

    @Test @MainActor func prefersExplicitDelegateModelOverRegistryFallback() {
        let registryModel = NodeAppModel()
        let explicitModel = NodeAppModel()
        kairosAppModelRegistry.appModel = registryModel
        defer { kairosAppModelRegistry.appModel = nil }

        let delegate = kairosAppDelegate()
        delegate.appModel = explicitModel

        #expect(delegate._test_resolvedAppModel() === explicitModel)
    }
}
