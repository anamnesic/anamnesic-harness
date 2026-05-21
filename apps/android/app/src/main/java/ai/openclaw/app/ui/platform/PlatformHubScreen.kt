package ai.kairos.app.ui.platform

import ai.kairos.app.ui.mobileAccent
import ai.kairos.app.ui.mobileBorderStrong
import ai.kairos.app.ui.mobileCardSurface
import ai.kairos.app.ui.mobileHeadline
import ai.kairos.app.ui.mobileText
import ai.kairos.app.ui.mobileTitle1
import ai.kairos.app.ui.mobileTitle2
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

private data class HubCard(val screen: PlatformScreen, val emoji: String, val label: String)

private val hubCards = listOf(
    HubCard(PlatformScreen.Dashboard, "📊", "Dashboard"),
    HubCard(PlatformScreen.Agents, "🤖", "Agents"),
    HubCard(PlatformScreen.Projects, "📁", "Projects"),
    HubCard(PlatformScreen.Workflows, "⚙️", "Workflows"),
    HubCard(PlatformScreen.Skills, "🎯", "Skills"),
    HubCard(PlatformScreen.Tools, "🔧", "Tools"),
    HubCard(PlatformScreen.Vault, "🔐", "Vault"),
    HubCard(PlatformScreen.Memory, "🧠", "Memory"),
    HubCard(PlatformScreen.Channels, "📡", "Channels"),
    HubCard(PlatformScreen.Providers, "🔌", "Providers"),
    HubCard(PlatformScreen.Extensions, "🧩", "Extensions"),
)

@Composable
fun PlatformHubScreen(onNavigate: (PlatformScreen) -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
    ) {
        Text("Platform", style = mobileTitle1, color = mobileText, modifier = Modifier.padding(bottom = 16.dp))
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            items(hubCards) { card ->
                Surface(
                    onClick = { onNavigate(card.screen) },
                    shape = RoundedCornerShape(16.dp),
                    color = mobileCardSurface,
                    border = androidx.compose.foundation.BorderStroke(1.dp, mobileBorderStrong),
                    modifier = Modifier.fillMaxWidth().aspectRatio(1.2f),
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize().padding(16.dp),
                        contentAlignment = Alignment.CenterStart,
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(card.emoji, style = mobileTitle2)
                            Text(card.label, style = mobileHeadline, color = mobileText)
                        }
                    }
                }
            }
        }
    }
}
