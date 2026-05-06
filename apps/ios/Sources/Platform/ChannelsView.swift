import SwiftUI

private struct ChannelItem: Identifiable {
    let id: String
    let name: String
    let status: String
}

struct ChannelsView: View {
    @Environment(NodeAppModel.self) private var appModel
    @State private var channels: [ChannelItem] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        List {
            if self.loading {
                ProgressView()
            } else if let error = self.error {
                Text("Error: \(error)").foregroundStyle(.red)
            } else if self.channels.isEmpty {
                Text("No channels found.").foregroundStyle(.secondary)
            } else {
                ForEach(self.channels) { channel in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(channel.name).font(.headline)
                            Text(channel.status).font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        if channel.status == "running" || channel.status == "connected" {
                            Button("Logout") {
                                Task { await self.logout(channel.id) }
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                            .tint(.red)
                        } else {
                            Button("Start") {
                                Task { await self.start(channel.id) }
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        }
                    }
                }
            }
        }
        .navigationTitle("Channels")
        .task { await self.load() }
    }

    private func load() async {
        self.loading = true
        self.error = nil
        do {
            let data = try await self.appModel.gatewayRequest(method: "channels.status")
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let arr = json?["channels"] as? [[String: Any]] ?? []
            self.channels = arr.compactMap { o -> ChannelItem? in
                guard let id = o["id"] as? String, !id.isEmpty else { return nil }
                let name = (o["name"] as? String ?? "").trimmingCharacters(in: .whitespaces)
                return ChannelItem(id: id, name: name.isEmpty ? id : name, status: o["status"] as? String ?? "stopped")
            }
        } catch {
            self.error = error.localizedDescription
        }
        self.loading = false
    }

    private func start(_ id: String) async {
        _ = try? await self.appModel.gatewayRequest(method: "channels.start", params: #"{"id":"\#(id)"}"#)
        await self.load()
    }

    private func logout(_ id: String) async {
        _ = try? await self.appModel.gatewayRequest(method: "channels.logout", params: #"{"id":"\#(id)"}"#)
        await self.load()
    }
}
