import SwiftUI

struct VaultView: View {
    @Environment(NodeAppModel.self) private var appModel
    @State private var keys: [String] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        List {
            if self.loading {
                ProgressView()
            } else if let error = self.error {
                Text("Error: \(error)").foregroundStyle(.red)
            } else if self.keys.isEmpty {
                Text("No secrets found.").foregroundStyle(.secondary)
            } else {
                Section("Secret Keys") {
                    ForEach(self.keys, id: \.self) { key in
                        HStack {
                            Image(systemName: "key.fill")
                                .foregroundStyle(.secondary)
                            Text(key).font(.body)
                            Spacer()
                            Text("••••••").foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Vault")
        .task { await self.load() }
    }

    private func load() async {
        self.loading = true
        self.error = nil
        do {
            let data = try await self.appModel.gatewayRequest(method: "config.get")
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let vault = json?["vault"] as? [String: Any] ?? json?["secrets"] as? [String: Any] ?? [:]
            self.keys = vault.keys.sorted()
        } catch {
            self.error = error.localizedDescription
        }
        self.loading = false
    }
}
