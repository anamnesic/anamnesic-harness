import SwiftUI

struct DashboardView: View {
    @Environment(NodeAppModel.self) private var appModel
    @State private var loading = true
    @State private var error: String?
    @State private var statusItems: [(label: String, value: String)] = []
    @State private var healthItems: [(label: String, value: String)] = []

    var body: some View {
        List {
            if self.loading {
                ProgressView()
            } else if let error = self.error {
                Text("Error: \(error)").foregroundStyle(.red)
            } else {
                if !self.statusItems.isEmpty {
                    Section("Status") {
                        ForEach(self.statusItems, id: \.label) { item in
                            LabeledContent(item.label, value: item.value)
                        }
                    }
                }
                if !self.healthItems.isEmpty {
                    Section("Health") {
                        ForEach(self.healthItems, id: \.label) { item in
                            LabeledContent(item.label, value: item.value)
                        }
                    }
                }
            }
        }
        .navigationTitle("Dashboard")
        .task { await self.load() }
    }

    private func load() async {
        self.loading = true
        self.error = nil
        do {
            async let statusData = self.appModel.gatewayRequest(method: "status")
            async let healthData = self.appModel.gatewayRequest(method: "health")
            let (sd, hd) = try await (statusData, healthData)
            self.statusItems = flatten(try JSONSerialization.jsonObject(with: sd) as? [String: Any] ?? [:])
            self.healthItems = flatten(try JSONSerialization.jsonObject(with: hd) as? [String: Any] ?? [:])
        } catch {
            self.error = error.localizedDescription
        }
        self.loading = false
    }
}

private func flatten(_ dict: [String: Any], prefix: String = "") -> [(label: String, value: String)] {
    dict.sorted(by: { $0.key < $1.key }).flatMap { key, val -> [(label: String, value: String)] in
        let label = prefix.isEmpty ? key : "\(prefix).\(key)"
        if let nested = val as? [String: Any] {
            return flatten(nested, prefix: label)
        }
        return [(label: label, value: "\(val)")]
    }
}
