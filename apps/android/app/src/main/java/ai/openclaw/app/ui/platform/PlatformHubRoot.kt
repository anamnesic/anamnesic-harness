package ai.kairos.app.ui.platform

import ai.kairos.app.MainViewModel
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue

internal enum class PlatformScreen {
    Hub, Dashboard, Agents, Projects, Workflows, Skills, Tools,
    Vault, Memory, Channels, Providers, Extensions
}

@Composable
fun PlatformHubRoot(viewModel: MainViewModel) {
    var screen by rememberSaveable { mutableStateOf(PlatformScreen.Hub) }
    when (screen) {
        PlatformScreen.Hub -> PlatformHubScreen(onNavigate = { screen = it })
        PlatformScreen.Dashboard -> DashboardScreen(viewModel = viewModel, onBack = { screen = PlatformScreen.Hub })
        PlatformScreen.Agents -> AgentsScreen(viewModel = viewModel, onBack = { screen = PlatformScreen.Hub })
        PlatformScreen.Projects -> ProjectsScreen(viewModel = viewModel, onBack = { screen = PlatformScreen.Hub })
        PlatformScreen.Workflows -> WorkflowsScreen(viewModel = viewModel, onBack = { screen = PlatformScreen.Hub })
        PlatformScreen.Skills -> SkillsScreen(viewModel = viewModel, onBack = { screen = PlatformScreen.Hub })
        PlatformScreen.Tools -> ToolsScreen(viewModel = viewModel, onBack = { screen = PlatformScreen.Hub })
        PlatformScreen.Vault -> VaultScreen(viewModel = viewModel, onBack = { screen = PlatformScreen.Hub })
        PlatformScreen.Memory -> MemoryScreen(viewModel = viewModel, onBack = { screen = PlatformScreen.Hub })
        PlatformScreen.Channels -> ChannelsScreen(viewModel = viewModel, onBack = { screen = PlatformScreen.Hub })
        PlatformScreen.Providers -> ProvidersScreen(viewModel = viewModel, onBack = { screen = PlatformScreen.Hub })
        PlatformScreen.Extensions -> ExtensionsScreen(viewModel = viewModel, onBack = { screen = PlatformScreen.Hub })
    }
}
