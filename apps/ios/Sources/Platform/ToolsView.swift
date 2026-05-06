import SwiftUI

private struct ToolItem: Identifiable {
    let id: String
    let name: String
    let description: String
}

struct ToolsView: View {
    @Environment(NodeAppModel.self) private var appModel
    @State private var tools: [ToolItem] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        List {
            if self.loading {
                ProgressView()
            } else if let error = self.error {
                Text("Error: \(error)").foregroundStyle(.red)
            } else if self.tools.isEmpty {
                Text("No tools found.").foregroundStyle(.secondary)
            } else {
                ForEach(self.tools) { tool in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(tool.name).font(.headline)
                        if !tool.description.isEmpty {
                            Text(tool.description)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                        }
                    }
                }
            }
        }
        .navigationTitle("Tools")
        .task { await self.load() }
    }

    private func load() async {
        self.loading = true
        self.error = nil
        do {
            let data = try await self.appModel.gatewayRequest(method: "tools.catalog")
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let arr = json?["tools"] as? [[String: Any]] ?? []
            self.tools = arr.compactMap { o -> ToolItem? in
                guard let name = o["name"] as? String, !name.isEmpty else { return nil }
                return ToolItem(
                    id: name,
                    name: name,
                    description: o["description"] as? String ?? ""
                )
            }
        } catch {
            self.error = error.localizedDescription
        }
        self.loading = false
    }
}
