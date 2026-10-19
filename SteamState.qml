pragma Singleton
import QtQuick
import Quickshell
import Quickshell.Io

// One shared view of Steam's status. Every widget and indicator copy binds
// to this, so a click updates all of them at once instead of each waiting
// for its own poll.
Singleton {
  id: root

  readonly property int stateOnline: 1
  readonly property int stateInvisible: 7
  readonly property string helper: Qt.resolvedUrl("steam-hide").toString().replace(/^file:\/\//, "")

  property bool steamRunning: false
  property int personaState: -1
  readonly property bool invisible: personaState === stateInvisible

  // After a click Steam takes a moment to save the new status; until it
  // does (or we give up), ignore polls that still report the old one so the
  // icon doesn't flick back and forth.
  property int pendingState: -1

  function refresh() {
    if (!statusProc.running) statusProc.running = true
  }

  function toggle() {
    if (!steamRunning) return
    pendingState = invisible ? stateOnline : stateInvisible
    personaState = pendingState
    // The helper reads Steam's saved status itself, so it always sends the
    // right command even if our view is stale.
    Quickshell.execDetached([helper, "toggle"])
    pendingTimeout.restart()
    confirmTimer.restart()
  }

  Process {
    id: statusProc
    command: [root.helper, "status"]
    stdout: StdioCollector {
      onStreamFinished: {
        var parts = text.trim().split(" ")
        var state = parts.length > 1 ? parseInt(parts[1], 10) : -1
        root.steamRunning = parts[0] === "1"
        if (root.pendingState !== -1) {
          if (state !== root.pendingState) return
          root.pendingState = -1
          pendingTimeout.stop()
        }
        root.personaState = state
      }
    }
  }

  Timer {
    interval: 3000
    running: true
    repeat: true
    triggeredOnStart: true
    onTriggered: root.refresh()
  }

  // Poll sooner after a click so the confirmation lands quickly.
  Timer {
    id: confirmTimer
    interval: 1000
    onTriggered: root.refresh()
  }

  Timer {
    id: pendingTimeout
    interval: 8000
    onTriggered: {
      root.pendingState = -1
      root.refresh()
    }
  }
}
