import SwiftUI

private struct ProviderItem: Identifiable {
    let id: String
    let name: String
    let kind: String
}

struct ProvidersView: View {
    @Environment(NodeAppModel.self) private var appModel
    @State private var providers: [ProviderItem] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        List {
            if self.loading {
                ProgressView()
            } else if let error = self.error {
                Text("Error: \(error)").foregroundStyle(.red)
            } else if self.providers.isEmpty {
                Text("No providers configured.").foregroundStyle(.secondary)
            } else {
                ForEach(self.providers) { provider in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(provider.name).font(.headline)
                            if !provider.kind.isEmpty {
                                Text(provider.kind).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                    }
                }
            }
        }
        .navigationTitle("Providers")
        .task { await self.load() }
    }

    private func load() async {
        self.loading = true
        self.error = nil
        do {
            let data = try await self.appModel.gatewayRequest(method: "config.get")
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let arr = json?["providers"] as? [[String: Any]] ?? []
            self.providers = arr.compactMap { o -> ProviderItem? in
                guard let id = o["id"] as? String ?? o["name"] as? String, !id.isEmpty else { return nil }
                let name = (o["name"] as? String ?? id).trimmingCharacters(in: .whitespaces)
                return ProviderItem(id: id, name: name, kind: o["kind"] as? String ?? o["type"] as? String ?? "")
            }
        } catch {
            self.error = error.localizedDescription
        }
        self.loading = false
    }
}
