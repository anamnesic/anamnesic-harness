package ai.kairos.app.ui.platform

import ai.kairos.app.MainViewModel
import ai.kairos.app.ui.mobileAccent
import ai.kairos.app.ui.mobileBody
import ai.kairos.app.ui.mobileCallout
import ai.kairos.app.ui.mobileCaption1
import ai.kairos.app.ui.mobileBorderStrong
import ai.kairos.app.ui.mobileCardSurface
import ai.kairos.app.ui.mobileDanger
import ai.kairos.app.ui.mobileDangerSoft
import ai.kairos.app.ui.mobileHeadline
import ai.kairos.app.ui.mobileSuccess
import ai.kairos.app.ui.mobileSuccessSoft
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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

private data class ChannelItem(val id: String, val name: String, val running: Boolean)

@Composable
fun ChannelsScreen(viewModel: MainViewModel, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var channels by remember { mutableStateOf(emptyList<ChannelItem>()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    fun load() {
        scope.launch {
            loading = true
            error = null
            viewModel.gatewayRequest("channels.status").fold(
                onSuccess = { json ->
                    val root = runCatching { JSONObject(json) }.getOrNull()
                    val arr = root?.optJSONArray("channels")
                    channels = if (arr != null) {
                        (0 until arr.length()).map { i ->
                            val o = arr.getJSONObject(i)
                            ChannelItem(
                                id = o.optString("id"),
                                name = o.optString("name").ifEmpty { o.optString("id") },
                                running = o.optBoolean("running", false),
                            )
                        }
                    } else emptyList()
                    loading = false
                },
                onFailure = { error = it.message; loading = false },
            )
        }
    }

    LaunchedEffect(Unit) { load() }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Surface(onClick = onBack, shape = RoundedCornerShape(8.dp), color = mobileCardSurface) {
                Text("← Back", style = mobileCallout, color = mobileAccent, modifier = Modifier.padding(8.dp, 6.dp))
            }
            Spacer(Modifier.width(12.dp))
            Text("Channels", style = mobileTitle2, color = mobileText)
        }
        Spacer(Modifier.height(16.dp))
        when {
            loading -> Text("Loading…", style = mobileBody, color = mobileTextSecondary)
            error != null -> Text("Error: $error", style = mobileCallout, color = mobileDanger)
            channels.isEmpty() -> Text("No channels configured.", style = mobileBody, color = mobileTextSecondary)
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(channels) { channel ->
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = mobileCardSurface,
                        border = androidx.compose.foundation.BorderStroke(1.dp, mobileBorderStrong),
                    ) {
                        Row(
                            Modifier.fillMaxWidth().padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(channel.name, style = mobileHeadline, color = mobileText, modifier = Modifier.weight(1f))
                            Surface(
                                onClick = {
                                    scope.launch {
                                        if (channel.running) {
                                            viewModel.gatewayRequest("channels.logout", """{"id":"${channel.id}"}""")
                                        } else {
                                            viewModel.gatewayRequest("channels.start", """{"id":"${channel.id}"}""")
                                        }
                                        load()
                                    }
                                },
                                shape = RoundedCornerShape(6.dp),
                                color = if (channel.running) mobileSuccessSoft else mobileDangerSoft,
                            ) {
                                Text(
                                    if (channel.running) "Running" else "Stopped",
                                    style = mobileCaption1,
                                    color = if (channel.running) mobileSuccess else mobileDanger,
                                    modifier = Modifier.padding(8.dp, 4.dp),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
