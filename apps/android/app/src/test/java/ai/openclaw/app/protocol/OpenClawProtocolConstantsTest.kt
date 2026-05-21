package ai.kairos.app.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class kairosProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", kairosCanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", kairosCanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", kairosCanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", kairosCanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", kairosCanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", kairosCanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", kairosCanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", kairosCanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", kairosCapability.Canvas.rawValue)
    assertEquals("camera", kairosCapability.Camera.rawValue)
    assertEquals("voiceWake", kairosCapability.VoiceWake.rawValue)
    assertEquals("location", kairosCapability.Location.rawValue)
    assertEquals("sms", kairosCapability.Sms.rawValue)
    assertEquals("device", kairosCapability.Device.rawValue)
    assertEquals("notifications", kairosCapability.Notifications.rawValue)
    assertEquals("system", kairosCapability.System.rawValue)
    assertEquals("photos", kairosCapability.Photos.rawValue)
    assertEquals("contacts", kairosCapability.Contacts.rawValue)
    assertEquals("calendar", kairosCapability.Calendar.rawValue)
    assertEquals("motion", kairosCapability.Motion.rawValue)
    assertEquals("callLog", kairosCapability.CallLog.rawValue)
  }

  @Test
  fun cameraCommandsUseStableStrings() {
    assertEquals("camera.list", kairosCameraCommand.List.rawValue)
    assertEquals("camera.snap", kairosCameraCommand.Snap.rawValue)
    assertEquals("camera.clip", kairosCameraCommand.Clip.rawValue)
  }

  @Test
  fun notificationsCommandsUseStableStrings() {
    assertEquals("notifications.list", kairosNotificationsCommand.List.rawValue)
    assertEquals("notifications.actions", kairosNotificationsCommand.Actions.rawValue)
  }

  @Test
  fun deviceCommandsUseStableStrings() {
    assertEquals("device.status", kairosDeviceCommand.Status.rawValue)
    assertEquals("device.info", kairosDeviceCommand.Info.rawValue)
    assertEquals("device.permissions", kairosDeviceCommand.Permissions.rawValue)
    assertEquals("device.health", kairosDeviceCommand.Health.rawValue)
  }

  @Test
  fun systemCommandsUseStableStrings() {
    assertEquals("system.notify", kairosSystemCommand.Notify.rawValue)
  }

  @Test
  fun photosCommandsUseStableStrings() {
    assertEquals("photos.latest", kairosPhotosCommand.Latest.rawValue)
  }

  @Test
  fun contactsCommandsUseStableStrings() {
    assertEquals("contacts.search", kairosContactsCommand.Search.rawValue)
    assertEquals("contacts.add", kairosContactsCommand.Add.rawValue)
  }

  @Test
  fun calendarCommandsUseStableStrings() {
    assertEquals("calendar.events", kairosCalendarCommand.Events.rawValue)
    assertEquals("calendar.add", kairosCalendarCommand.Add.rawValue)
  }

  @Test
  fun motionCommandsUseStableStrings() {
    assertEquals("motion.activity", kairosMotionCommand.Activity.rawValue)
    assertEquals("motion.pedometer", kairosMotionCommand.Pedometer.rawValue)
  }

  @Test
  fun smsCommandsUseStableStrings() {
    assertEquals("sms.send", kairosSmsCommand.Send.rawValue)
    assertEquals("sms.search", kairosSmsCommand.Search.rawValue)
  }

  @Test
  fun callLogCommandsUseStableStrings() {
    assertEquals("callLog.search", kairosCallLogCommand.Search.rawValue)
  }
}
