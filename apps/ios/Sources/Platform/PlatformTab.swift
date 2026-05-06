import SwiftUI

struct PlatformTab: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    NavigationLink(destination: DashboardView()) {
                        PlatformCard(emoji: "📊", title: "Dashboard")
                    }
                    NavigationLink(destination: AgentsView()) {
                        PlatformCard(emoji: "🤖", title: "Agents")
                    }
                    NavigationLink(destination: ProjectsView()) {
                        PlatformCard(emoji: "📁", title: "Projects")
                    }
                    NavigationLink(destination: WorkflowsView()) {
                        PlatformCard(emoji: "⚙️", title: "Workflows")
                    }
                    NavigationLink(destination: SkillsView()) {
                        PlatformCard(emoji: "🎯", title: "Skills")
                    }
                    NavigationLink(destination: ToolsView()) {
                        PlatformCard(emoji: "🔧", title: "Tools")
                    }
                    NavigationLink(destination: VaultView()) {
                        PlatformCard(emoji: "🔐", title: "Vault")
                    }
                    NavigationLink(destination: MemoryView()) {
                        PlatformCard(emoji: "🧠", title: "Memory")
                    }
                    NavigationLink(destination: ChannelsView()) {
                        PlatformCard(emoji: "📡", title: "Channels")
                    }
                    NavigationLink(destination: ProvidersView()) {
                        PlatformCard(emoji: "🔌", title: "Providers")
                    }
                    NavigationLink(destination: ExtensionsView()) {
                        PlatformCard(emoji: "🧩", title: "Extensions")
                    }
                }
                .padding(16)
            }
            .navigationTitle("Platform")
            .background(Color(.systemGroupedBackground))
        }
    }
}

private struct PlatformCard: View {
    let emoji: String
    let title: String

    var body: some View {
        VStack(spacing: 12) {
            Text(emoji).font(.system(size: 32))
            Text(title)
                .font(.headline)
                .foregroundStyle(.primary)
        }
        .frame(maxWidth: .infinity)
        .padding(20)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}
