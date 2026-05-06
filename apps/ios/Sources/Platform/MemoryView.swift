import SwiftUI

struct MemoryView: View {
    @Environment(NodeAppModel.self) private var appModel
    @State private var items: [(label: String, value: String)] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        List {
            if self.loading {
                ProgressView()
            } else if let error = self.error {
                Text("Error: \(error)").foregroundStyle(.red)
            } else if self.items.isEmpty {
                Text("No memory info available.").foregroundStyle(.secondary)
            } else {
                ForEach(self.items, id: \.label) { item in
                    LabeledContent(item.label, value: item.value)
                }
            }
        }
        .navigationTitle("Memory")
        .task { await self.load() }
    }

    private func load() async {
        self.loading = true
        self.error = nil
        do {
            let data = try await self.appModel.gatewayRequest(method: "doctor.memory.status")
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
            self.items = json.sorted(by: { $0.key < $1.key }).map { (label: $0.key, value: "\($0.value)") }
        } catch {
            self.error = error.localizedDescription
        }
        self.loading = false
    }
}
