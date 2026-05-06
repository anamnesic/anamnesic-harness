import SwiftUI

private struct CronJob: Identifiable {
    let id: String
    let name: String
    let schedule: String
    let enabled: Bool
}

struct WorkflowsView: View {
    @Environment(NodeAppModel.self) private var appModel
    @State private var jobs: [CronJob] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        List {
            if self.loading {
                ProgressView()
            } else if let error = self.error {
                Text("Error: \(error)").foregroundStyle(.red)
            } else if self.jobs.isEmpty {
                Text("No scheduled workflows.").foregroundStyle(.secondary)
            } else {
                ForEach(self.jobs) { job in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(job.name).font(.headline)
                            Text(job.schedule).font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button("Run") {
                            Task { await self.run(job.id) }
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                        .disabled(!job.enabled)
                    }
                }
            }
        }
        .navigationTitle("Workflows")
        .task { await self.load() }
    }

    private func load() async {
        self.loading = true
        self.error = nil
        do {
            let data = try await self.appModel.gatewayRequest(method: "cron.list")
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let arr = json?["jobs"] as? [[String: Any]] ?? []
            self.jobs = arr.compactMap { o -> CronJob? in
                guard let id = o["id"] as? String, !id.isEmpty else { return nil }
                let name = (o["name"] as? String ?? "").trimmingCharacters(in: .whitespaces)
                return CronJob(
                    id: id,
                    name: name.isEmpty ? id : name,
                    schedule: o["schedule"] as? String ?? "",
                    enabled: o["enabled"] as? Bool ?? true
                )
            }
        } catch {
            self.error = error.localizedDescription
        }
        self.loading = false
    }

    private func run(_ id: String) async {
        _ = try? await self.appModel.gatewayRequest(method: "cron.run", params: #"{"id":"\#(id)"}"#)
    }
}
