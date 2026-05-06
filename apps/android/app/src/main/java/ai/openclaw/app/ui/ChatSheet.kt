package ai.kairos.app.ui

import ai.kairos.app.MainViewModel
import ai.kairos.app.ui.chat.ChatSheetContent
import androidx.compose.runtime.Composable

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
