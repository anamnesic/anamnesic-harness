package ai.kairos.app.node

import ai.kairos.app.protocol.kairosCalendarCommand
import ai.kairos.app.protocol.kairosCallLogCommand
import ai.kairos.app.protocol.kairosCameraCommand
import ai.kairos.app.protocol.kairosCapability
import ai.kairos.app.protocol.kairosContactsCommand
import ai.kairos.app.protocol.kairosDeviceCommand
import ai.kairos.app.protocol.kairosLocationCommand
import ai.kairos.app.protocol.kairosMotionCommand
import ai.kairos.app.protocol.kairosNotificationsCommand
import ai.kairos.app.protocol.kairosPhotosCommand
import ai.kairos.app.protocol.kairosSmsCommand
import ai.kairos.app.protocol.kairosSystemCommand
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class InvokeCommandRegistryTest {
  private val coreCapabilities =
    setOf(
      kairosCapability.Canvas.rawValue,
      kairosCapability.Device.rawValue,
      kairosCapability.Notifications.rawValue,
      kairosCapability.System.rawValue,
      kairosCapability.Photos.rawValue,
      kairosCapability.Contacts.rawValue,
      kairosCapability.Calendar.rawValue,
    )

  private val optionalCapabilities =
    setOf(
      kairosCapability.Camera.rawValue,
      kairosCapability.Location.rawValue,
      kairosCapability.Sms.rawValue,
      kairosCapability.CallLog.rawValue,
      kairosCapability.VoiceWake.rawValue,
      kairosCapability.Motion.rawValue,
    )

  private val coreCommands =
    setOf(
      kairosDeviceCommand.Status.rawValue,
      kairosDeviceCommand.Info.rawValue,
      kairosDeviceCommand.Permissions.rawValue,
      kairosDeviceCommand.Health.rawValue,
      kairosNotificationsCommand.List.rawValue,
      kairosNotificationsCommand.Actions.rawValue,
      kairosSystemCommand.Notify.rawValue,
      kairosPhotosCommand.Latest.rawValue,
      kairosContactsCommand.Search.rawValue,
      kairosContactsCommand.Add.rawValue,
      kairosCalendarCommand.Events.rawValue,
      kairosCalendarCommand.Add.rawValue,
    )

  private val optionalCommands =
    setOf(
      kairosCameraCommand.Snap.rawValue,
      kairosCameraCommand.Clip.rawValue,
      kairosCameraCommand.List.rawValue,
      kairosLocationCommand.Get.rawValue,
      kairosMotionCommand.Activity.rawValue,
      kairosMotionCommand.Pedometer.rawValue,
      kairosSmsCommand.Send.rawValue,
      kairosSmsCommand.Search.rawValue,
      kairosCallLogCommand.Search.rawValue,
    )

  private val debugCommands = setOf("debug.logs", "debug.ed25519")

  @Test
  fun advertisedCapabilities_respectsFeatureAvailability() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags())

    assertContainsAll(capabilities, coreCapabilities)
    assertMissingAll(capabilities, optionalCapabilities)
  }

  @Test
  fun advertisedCapabilities_includesFeatureCapabilitiesWhenEnabled() {
    val capabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(
          cameraEnabled = true,
          locationEnabled = true,
          sendSmsAvailable = true,
          readSmsAvailable = true,
          smsSearchPossible = true,
          callLogAvailable = true,
          voiceWakeEnabled = true,
          motionActivityAvailable = true,
          motionPedometerAvailable = true,
        ),
      )

    assertContainsAll(capabilities, coreCapabilities + optionalCapabilities)
  }

  @Test
  fun advertisedCommands_respectsFeatureAvailability() {
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags())

    assertContainsAll(commands, coreCommands)
    assertMissingAll(commands, optionalCommands + debugCommands)
  }

  @Test
  fun advertisedCommands_includesFeatureCommandsWhenEnabled() {
    val commands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(
          cameraEnabled = true,
          locationEnabled = true,
          sendSmsAvailable = true,
          readSmsAvailable = true,
          smsSearchPossible = true,
          callLogAvailable = true,
          motionActivityAvailable = true,
          motionPedometerAvailable = true,
          debugBuild = true,
        ),
      )

    assertContainsAll(commands, coreCommands + optionalCommands + debugCommands)
  }

  @Test
  fun advertisedCommands_onlyIncludesSupportedMotionCommands() {
    val commands =
      InvokeCommandRegistry.advertisedCommands(
        NodeRuntimeFlags(
          cameraEnabled = false,
          locationEnabled = false,
          sendSmsAvailable = false,
          readSmsAvailable = false,
          smsSearchPossible = false,
          callLogAvailable = false,
          voiceWakeEnabled = false,
          motionActivityAvailable = true,
          motionPedometerAvailable = false,
          debugBuild = false,
        ),
      )

    assertTrue(commands.contains(kairosMotionCommand.Activity.rawValue))
    assertFalse(commands.contains(kairosMotionCommand.Pedometer.rawValue))
  }

  @Test
  fun advertisedCommands_splitsSmsSendAndSearchAvailability() {
    val readOnlyCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(readSmsAvailable = true, smsSearchPossible = true),
      )
    val sendOnlyCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(sendSmsAvailable = true),
      )
    val requestableSearchCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(smsSearchPossible = true),
      )

    assertTrue(readOnlyCommands.contains(kairosSmsCommand.Search.rawValue))
    assertFalse(readOnlyCommands.contains(kairosSmsCommand.Send.rawValue))
    assertTrue(sendOnlyCommands.contains(kairosSmsCommand.Send.rawValue))
    assertFalse(sendOnlyCommands.contains(kairosSmsCommand.Search.rawValue))
    assertTrue(requestableSearchCommands.contains(kairosSmsCommand.Search.rawValue))
  }

  @Test
  fun advertisedCapabilities_includeSmsWhenEitherSmsPathIsAvailable() {
    val readOnlyCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(readSmsAvailable = true),
      )
    val sendOnlyCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(sendSmsAvailable = true),
      )
    val requestableSearchCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(smsSearchPossible = true),
      )

    assertTrue(readOnlyCapabilities.contains(kairosCapability.Sms.rawValue))
    assertTrue(sendOnlyCapabilities.contains(kairosCapability.Sms.rawValue))
    assertFalse(requestableSearchCapabilities.contains(kairosCapability.Sms.rawValue))
  }

  @Test
  fun advertisedCommands_excludesCallLogWhenUnavailable() {
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags(callLogAvailable = false))

    assertFalse(commands.contains(kairosCallLogCommand.Search.rawValue))
  }

  @Test
  fun advertisedCapabilities_excludesCallLogWhenUnavailable() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags(callLogAvailable = false))

    assertFalse(capabilities.contains(kairosCapability.CallLog.rawValue))
  }

  @Test
  fun advertisedCapabilities_includesVoiceWakeWithoutAdvertisingCommands() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags(voiceWakeEnabled = true))
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags(voiceWakeEnabled = true))

    assertTrue(capabilities.contains(kairosCapability.VoiceWake.rawValue))
    assertFalse(commands.any { it.contains("voice", ignoreCase = true) })
  }

  @Test
  fun find_returnsForegroundMetadataForCameraCommands() {
    val list = InvokeCommandRegistry.find(kairosCameraCommand.List.rawValue)
    val location = InvokeCommandRegistry.find(kairosLocationCommand.Get.rawValue)

    assertNotNull(list)
    assertEquals(true, list?.requiresForeground)
    assertNotNull(location)
    assertEquals(false, location?.requiresForeground)
  }

  @Test
  fun find_returnsNullForUnknownCommand() {
    assertNull(InvokeCommandRegistry.find("not.real"))
  }

  private fun defaultFlags(
    cameraEnabled: Boolean = false,
    locationEnabled: Boolean = false,
    sendSmsAvailable: Boolean = false,
    readSmsAvailable: Boolean = false,
    smsSearchPossible: Boolean = false,
    callLogAvailable: Boolean = false,
    voiceWakeEnabled: Boolean = false,
    motionActivityAvailable: Boolean = false,
    motionPedometerAvailable: Boolean = false,
    debugBuild: Boolean = false,
  ): NodeRuntimeFlags =
    NodeRuntimeFlags(
      cameraEnabled = cameraEnabled,
      locationEnabled = locationEnabled,
      sendSmsAvailable = sendSmsAvailable,
      readSmsAvailable = readSmsAvailable,
      smsSearchPossible = smsSearchPossible,
      callLogAvailable = callLogAvailable,
      voiceWakeEnabled = voiceWakeEnabled,
      motionActivityAvailable = motionActivityAvailable,
      motionPedometerAvailable = motionPedometerAvailable,
      debugBuild = debugBuild,
    )

  private fun assertContainsAll(
    actual: List<String>,
    expected: Set<String>,
  ) {
    expected.forEach { value -> assertTrue(actual.contains(value)) }
  }

  private fun assertMissingAll(
    actual: List<String>,
    forbidden: Set<String>,
  ) {
    forbidden.forEach { value -> assertFalse(actual.contains(value)) }
  }
}
