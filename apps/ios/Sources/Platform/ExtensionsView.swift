import SwiftUI

private struct PluginItem: Identifiable {
    let id: String
    let name: String
    let version: String
}

struct ExtensionsView: View {
    @Environment(NodeAppModel.self) private var appModel
    @State private var plugins: [PluginItem] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        List {
            if self.loading {
                ProgressView()
            } else if let error = self.error {
                Text("Error: \(error)").foregroundStyle(.red)
            } else if self.plugins.isEmpty {
                Text("No extensions installed.").foregroundStyle(.secondary)
            } else {
                ForEach(self.plugins) { plugin in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(plugin.name).font(.headline)
                            if !plugin.version.isEmpty {
                                Text("v\(plugin.version)").font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                    }
                }
            }
        }
        .navigationTitle("Extensions")
        .task { await self.load() }
    }

    private func load() async {
        self.loading = true
        self.error = nil
        do {
            let data = try await self.appModel.gatewayRequest(method: "plugins.uiDescriptors")
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let arr = json?["plugins"] as? [[String: Any]] ?? []
            self.plugins = arr.compactMap { o -> PluginItem? in
                guard let id = o["id"] as? String ?? o["name"] as? String, !id.isEmpty else { return nil }
                let name = (o["name"] as? String ?? id).trimmingCharacters(in: .whitespaces)
                return PluginItem(id: id, name: name, version: o["version"] as? String ?? "")
            }
        } catch {
            self.error = error.localizedDescription
        }
        self.loading = false
    }
}
