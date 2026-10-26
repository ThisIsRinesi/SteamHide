pragma Singleton
import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons as Commons

Singleton {
  id: root
  Commons.Translations { id: strings; directory: Qt.resolvedUrl("i18n") }
  readonly property string helper: decodeURIComponent(Qt.resolvedUrl("presence-hide").toString().replace(/^file:\/\//, ""))
  property string steamStatus: ""
  property string discordStatus: ""
  property string targetStatus: ""
  property string error: ""
  property bool pending: false
  readonly property bool available: steamStatus !== "" || discordStatus !== ""
  readonly property bool invisible: targetStatus === "invisible"
  readonly property string tooltip: strings.t("tooltip")
    .arg(steamStatus || strings.t("notRunning"))
    .arg(discordStatus || strings.t("notConnected"))
    .arg(pending ? "\n" + strings.t("applying") : "")
    .arg(error ? "\n" + error : "")
    .arg(invisible ? strings.t("goOnline") : strings.t("goInvisible"))

  function accept(text) {
    try {
      var status = JSON.parse(text)
      steamStatus = status.steam || ""
      discordStatus = status.discord || ""
      targetStatus = status.target || ""
      error = status.error || ""
      pending = status.pending === true
    } catch (e) { error = strings.t("invalidResponse") }
  }
  function refresh() {
    if (!statusProc.running && !toggleProc.running) statusProc.running = true
  }
  function toggle() {
    if (!available || toggleProc.running) return
    pending = true
    toggleProc.running = true
  }
  Process {
    id: statusProc
    command: [root.helper, "status"]
    stdout: StdioCollector { onStreamFinished: root.accept(text) }
  }
  Process {
    id: toggleProc
    command: [root.helper, "toggle"]
    stdout: StdioCollector { onStreamFinished: root.accept(text) }
  }
  Timer {
    interval: 2000
    running: true
    repeat: true
    triggeredOnStart: true
    onTriggered: root.refresh()
  }
}
