import SwiftUI

private struct SkillItem: Identifiable {
    let id: String
    let name: String
    let status: String
}

struct SkillsView: View {
    @Environment(NodeAppModel.self) private var appModel
    @State private var skills: [SkillItem] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        List {
            if self.loading {
                ProgressView()
            } else if let error = self.error {
                Text("Error: \(error)").foregroundStyle(.red)
            } else if self.skills.isEmpty {
                Text("No skills found.").foregroundStyle(.secondary)
            } else {
                ForEach(self.skills) { skill in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(skill.name).font(.headline)
                        }
                        Spacer()
                        Text(skill.status)
                            .font(.caption)
                            .foregroundStyle(skill.status == "active" ? .green : .secondary)
                    }
                }
            }
        }
        .navigationTitle("Skills")
        .task { await self.load() }
    }

    private func load() async {
        self.loading = true
        self.error = nil
        do {
            let data = try await self.appModel.gatewayRequest(method: "skills.status")
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let arr = json?["skills"] as? [[String: Any]] ?? []
            self.skills = arr.compactMap { o -> SkillItem? in
                guard let id = o["id"] as? String ?? o["name"] as? String, !id.isEmpty else { return nil }
                let name = (o["name"] as? String ?? id).trimmingCharacters(in: .whitespaces)
                return SkillItem(id: id, name: name, status: o["status"] as? String ?? "unknown")
            }
        } catch {
            self.error = error.localizedDescription
        }
        self.loading = false
    }
}
