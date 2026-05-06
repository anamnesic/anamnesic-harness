import SwiftUI

private struct SessionItem: Identifiable {
    let id: String
    let title: String
    let status: String
}

struct ProjectsView: View {
    @Environment(NodeAppModel.self) private var appModel
    @State private var sessions: [SessionItem] = []
    @State private var loading = true
    @State private var error: String?
    @State private var newTitle = ""

    var body: some View {
        List {
            Section {
                HStack {
                    TextField("New project title…", text: self.$newTitle)
                    Button("Create") {
                        Task { await self.create() }
                    }
                    .disabled(self.newTitle.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            Section {
                if self.loading {
                    ProgressView()
                } else if let error = self.error {
                    Text("Error: \(error)").foregroundStyle(.red)
                } else if self.sessions.isEmpty {
                    Text("No projects yet.").foregroundStyle(.secondary)
                } else {
                    ForEach(self.sessions) { item in
                        VStack(alignment: .leading) {
                            Text(item.title).font(.headline)
                            Text(item.status).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Projects")
        .task { await self.load() }
    }

    private func load() async {
        self.loading = true
        self.error = nil
        do {
            let data = try await self.appModel.gatewayRequest(method: "sessions.list")
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let arr = json?["sessions"] as? [[String: Any]] ?? []
            self.sessions = arr.compactMap { o -> SessionItem? in
                guard let id = o["id"] as? String, !id.isEmpty else { return nil }
                let title = (o["title"] as? String ?? o["name"] as? String ?? "").trimmingCharacters(in: .whitespaces)
                return SessionItem(id: id, title: title.isEmpty ? id : title, status: o["status"] as? String ?? "")
            }
        } catch {
            self.error = error.localizedDescription
        }
        self.loading = false
    }

    private func create() async {
        let title = self.newTitle.trimmingCharacters(in: .whitespaces)
        guard !title.isEmpty else { return }
        _ = try? await self.appModel.gatewayRequest(method: "sessions.create", params: #"{"title":"\#(title)"}"#)
        self.newTitle = ""
        await self.load()
    }
}
