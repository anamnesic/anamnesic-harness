package ai.kairos.app.ui.platform

import ai.kairos.app.MainViewModel
import ai.kairos.app.ui.mobileAccent
import ai.kairos.app.ui.mobileBody
import ai.kairos.app.ui.mobileCallout
import ai.kairos.app.ui.mobileCaption1
import ai.kairos.app.ui.mobileCardSurface
import ai.kairos.app.ui.mobileDanger
import ai.kairos.app.ui.mobileHeadline
import ai.kairos.app.ui.mobileText
import ai.kairos.app.ui.mobileTextSecondary
import ai.kairos.app.ui.mobileTitle2
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable
fun DashboardScreen(viewModel: MainViewModel, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var statusJson by remember { mutableStateOf<JSONObject?>(null) }
    var healthJson by remember { mutableStateOf<JSONObject?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        scope.launch {
            loading = true
            error = null
            viewModel.gatewayRequest("status").fold(
                onSuccess = { json -> statusJson = runCatching { JSONObject(json) }.getOrNull() },
                onFailure = { error = it.message },
            )
            viewModel.gatewayRequest("health").fold(
                onSuccess = { json -> healthJson = runCatching { JSONObject(json) }.getOrNull() },
                onFailure = { /* non-fatal */ },
            )
            loading = false
        }
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Surface(onClick = onBack, shape = RoundedCornerShape(8.dp), color = mobileCardSurface) {
                Text("← Back", style = mobileCallout, color = mobileAccent, modifier = Modifier.padding(8.dp, 6.dp))
            }
            Spacer(Modifier.width(12.dp))
            Text("Dashboard", style = mobileTitle2, color = mobileText)
        }
        Spacer(Modifier.height(20.dp))
        when {
            loading -> Text("Loading…", style = mobileBody, color = mobileTextSecondary)
            error != null -> Text("Error: $error", style = mobileCallout, color = mobileDanger)
            else -> {
                val status = statusJson
                val health = healthJson
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (status != null) {
                        DashboardRow("Version", status.optString("version", "—"))
                        DashboardRow("Uptime", status.optString("uptime", "—"))
                        DashboardRow("Agents", status.optInt("agentCount", 0).toString())
                        DashboardRow("Sessions", status.optInt("sessionCount", 0).toString())
                    }
                    if (health != null) {
                        DashboardRow("Health", health.optString("status", "—"))
                    }
                    if (status == null && health == null) {
                        Text("No data available.", style = mobileBody, color = mobileTextSecondary)
                    }
                }
            }
        }
    }
}

@Composable
private fun DashboardRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = mobileHeadline, color = mobileTextSecondary)
        Text(value, style = mobileCaption1, color = mobileText)
    }
}
