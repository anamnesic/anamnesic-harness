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

private data class SkillItem(val id: String, val name: String, val enabled: Boolean, val version: String)

@Composable
fun SkillsScreen(viewModel: MainViewModel, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var skills by remember { mutableStateOf(emptyList<SkillItem>()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    fun load() {
        scope.launch {
            loading = true
            error = null
            viewModel.gatewayRequest("skills.status").fold(
                onSuccess = { json ->
                    val root = runCatching { JSONObject(json) }.getOrNull()
                    val arr = root?.optJSONArray("skills")
                    skills = if (arr != null) {
                        (0 until arr.length()).map { i ->
                            val o = arr.getJSONObject(i)
                            SkillItem(
                                id = o.optString("id"),
                                name = o.optString("name").ifEmpty { o.optString("id") },
                                enabled = o.optBoolean("enabled", false),
                                version = o.optString("version", ""),
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
            Text("Skills", style = mobileTitle2, color = mobileText)
        }
        Spacer(Modifier.height(16.dp))
        when {
            loading -> Text("Loading…", style = mobileBody, color = mobileTextSecondary)
            error != null -> Text("Error: $error", style = mobileCallout, color = mobileDanger)
            skills.isEmpty() -> Text("No skills installed.", style = mobileBody, color = mobileTextSecondary)
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(skills) { skill ->
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
                            Column(modifier = Modifier.weight(1f)) {
                                Text(skill.name, style = mobileHeadline, color = mobileText)
                                if (skill.version.isNotEmpty()) {
                                    Text("v${skill.version}", style = mobileCaption1, color = mobileTextSecondary)
                                }
                            }
                            Surface(
                                onClick = {
                                    scope.launch {
                                        if (skill.enabled) {
                                            viewModel.gatewayRequest("skills.update", """{"id":"${skill.id}","enabled":false}""")
                                        } else {
                                            viewModel.gatewayRequest("skills.install", """{"id":"${skill.id}"}""")
                                        }
                                        load()
                                    }
                                },
                                shape = RoundedCornerShape(6.dp),
                                color = if (skill.enabled) mobileSuccessSoft else mobileDangerSoft,
                            ) {
                                Text(
                                    if (skill.enabled) "Enabled" else "Disabled",
                                    style = mobileCaption1,
                                    color = if (skill.enabled) mobileSuccess else mobileDanger,
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
