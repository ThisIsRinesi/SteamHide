import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui

BarWidget {
  id: root
  moduleName: "io.github.michaelsucks.steam-status-toggle"

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  IpcHandler {
    target: "io.github.michaelsucks.steam-status-toggle"

    function toggle(): void {
      SteamState.toggle()
    }

    function refresh(): void {
      SteamState.refresh()
    }
  }

  BarIconButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    active: SteamState.steamRunning && SteamState.invisible
    // Steam logo while online; the crossed-out eye glyph while invisible.
    text: SteamState.invisible ? "󰈉" : ""
    iconComponent: SteamState.invisible ? null : steamIcon

    Component {
      id: steamIcon
      Item {
        SteamIcon {
          anchors.centerIn: parent
          iconWidth: Style.space(17)
          color: button.foreground
        }
      }
    }
    dimmed: !SteamState.steamRunning
    tooltipText: !SteamState.steamRunning ? "Steam is not running"
      : SteamState.invisible ? "Steam: Invisible (click to go online)"
      : "Steam: Online (click to go invisible)"
    onPressed: SteamState.toggle()
  }
}
