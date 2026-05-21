package ai.kairos.app

import android.content.Intent

const val actionAskkairos = "ai.kairos.app.action.ASK_kairos"
const val extraAssistantPrompt = "prompt"

enum class HomeDestination {
  Connect,
  Chat,
  Voice,
  Screen,
  Settings,
}

data class AssistantLaunchRequest(
  val source: String,
  val prompt: String?,
  val autoSend: Boolean,
)

fun parseAssistantLaunchIntent(intent: Intent?): AssistantLaunchRequest? {
  val action = intent?.action ?: return null
  return when (action) {
    Intent.ACTION_ASSIST ->
      AssistantLaunchRequest(
        source = "assist",
        prompt = null,
        autoSend = false,
      )

    actionAskkairos -> {
      val prompt = intent.getStringExtra(extraAssistantPrompt)?.trim()?.ifEmpty { null }
      AssistantLaunchRequest(
        source = "app_action",
        prompt = prompt,
        autoSend = false,
      )
    }

    else -> null
  }
}
