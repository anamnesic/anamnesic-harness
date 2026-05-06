package ai.kairos.app.ui.platform

import ai.kairos.app.MainViewModel
import ai.kairos.app.ui.mobileAccent
import ai.kairos.app.ui.mobileBody
import ai.kairos.app.ui.mobileCallout
import ai.kairos.app.ui.mobileCaption1
import ai.kairos.app.ui.mobileBorder
import ai.kairos.app.ui.mobileBorderStrong
import ai.kairos.app.ui.mobileCardSurface
import ai.kairos.app.ui.mobileDanger
import ai.kairos.app.ui.mobileDangerSoft
import ai.kairos.app.ui.mobileHeadline
import ai.kairos.app.ui.mobileText
import ai.kairos.app.ui.mobileTextSecondary
import ai.kairos.app.ui.mobileTextTertiary
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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.json.JSONObject

private data class AgentItem(val id: String, val name: String, val state: String)

@Composable
fun AgentsScreen(viewModel: MainViewModel, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var agents by remember { mutableStateOf(emptyList<AgentItem>()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var newName by remember { mutableStateOf("") }

    fun load() {
        scope.launch {
            loading = true
            error = null
            viewModel.gatewayRequest("agents.list").fold(
                onSuccess = { json ->
                    val root = JSONObject(json)
                    val arr = root.optJSONArray("agents") ?: run { agents = emptyList(); loading = false; return@launch }
                    agents = (0 until arr.length()).map { i ->
                        val o = arr.getJSONObject(i)
                        AgentItem(
                            id = o.optString("id"),
                            name = o.optString("name").ifEmpty { o.optString("id") },
                            state = o.optString("state", "idle"),
                        )
                    }
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
            Text("Agents", style = mobileTitle2, color = mobileText)
        }
        Spacer(Modifier.height(16.dp))
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedTextField(
                value = newName,
                onValueChange = { newName = it },
                placeholder = { Text("New agent name…", style = mobileCallout, color = mobileTextTertiary) },
                modifier = Modifier.weight(1f),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = mobileAccent,
                    unfocusedBorderColor = mobileBorder,
                    focusedTextColor = mobileText,
                    unfocusedTextColor = mobileText,
                ),
            )
            Surface(
                onClick = {
                    if (newName.isBlank()) return@Surface
                    scope.launch {
                        viewModel.gatewayRequest("agents.create", """{"name":"${newName.trim()}"}""")
                        newName = ""
                        load()
                    }
                },
                shape = RoundedCornerShape(8.dp),
                color = if (newName.isBlank()) mobileBorder else mobileAccent,
            ) {
                Text(
                    "+ Create",
                    style = mobileCallout,
                    color = if (newName.isBlank()) mobileTextSecondary else Color.White,
                    modifier = Modifier.padding(12.dp, 8.dp),
                )
            }
        }
        Spacer(Modifier.height(12.dp))
        when {
            loading -> Text("Loading…", style = mobileBody, color = mobileTextSecondary)
            error != null -> Text("Error: $error", style = mobileCallout, color = mobileDanger)
            agents.isEmpty() -> Text("No agents yet.", style = mobileBody, color = mobileTextSecondary)
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(agents) { agent ->
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
                            Column {
                                Text(agent.name, style = mobileHeadline, color = mobileText)
                                Text(agent.state, style = mobileCaption1, color = mobileTextSecondary)
                            }
                            Surface(
                                onClick = {
                                    scope.launch {
                                        viewModel.gatewayRequest("agents.delete", """{"id":"${agent.id}"}""")
                                        load()
                                    }
                                },
                                shape = RoundedCornerShape(6.dp),
                                color = mobileDangerSoft,
                            ) {
                                Text("Delete", style = mobileCaption1, color = mobileDanger, modifier = Modifier.padding(8.dp, 4.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}
