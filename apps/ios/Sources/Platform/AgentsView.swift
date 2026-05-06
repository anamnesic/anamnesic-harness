import SwiftUI

private struct AgentItem: Identifiable {
    let id: String
    let name: String
    let state: String
}

struct AgentsView: View {
    @Environment(NodeAppModel.self) private var appModel
    @State private var agents: [AgentItem] = []
    @State private var loading = true
    @State private var error: String?
    @State private var newName = ""

    var body: some View {
        List {
            Section {
                HStack {
                    TextField("New agent name…", text: self.$newName)
                    Button("Create") {
                        Task { await self.create() }
                    }
                    .disabled(self.newName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            Section {
                if self.loading {
                    ProgressView()
                } else if let error = self.error {
                    Text("Error: \(error)").foregroundStyle(.red)
                } else if self.agents.isEmpty {
                    Text("No agents yet.").foregroundStyle(.secondary)
                } else {
                    ForEach(self.agents) { agent in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(agent.name).font(.headline)
                                Text(agent.state).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                        }
                    }
                    .onDelete { indexSet in
                        Task {
                            for i in indexSet {
                                let id = self.agents[i].id
                                _ = try? await self.appModel.gatewayRequest(method: "agents.delete", params: #"{"id":"\#(id)"}"#)
                            }
                            await self.load()
                        }
                    }
                }
            }
        }
        .navigationTitle("Agents")
        .task { await self.load() }
    }

    private func load() async {
        self.loading = true
        self.error = nil
        do {
            let data = try await self.appModel.gatewayRequest(method: "agents.list")
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let arr = json?["agents"] as? [[String: Any]] ?? []
            self.agents = arr.compactMap { o -> AgentItem? in
                guard let id = o["id"] as? String, !id.isEmpty else { return nil }
                let name = (o["name"] as? String ?? "").trimmingCharacters(in: .whitespaces)
                return AgentItem(id: id, name: name.isEmpty ? id : name, state: o["state"] as? String ?? "idle")
            }
        } catch {
            self.error = error.localizedDescription
        }
        self.loading = false
    }

    private func create() async {
        let name = self.newName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        _ = try? await self.appModel.gatewayRequest(method: "agents.create", params: #"{"name":"\#(name)"}"#)
        self.newName = ""
        await self.load()
    }
}
