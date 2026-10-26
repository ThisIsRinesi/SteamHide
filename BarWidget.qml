import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui

BarWidget {
  id: root
  moduleName: "io.github.thisisrinesi.presence-hide"

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  IpcHandler {
    target: "io.github.thisisrinesi.presence-hide"

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
    active: SteamState.available && SteamState.invisible
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
    dimmed: !SteamState.available
    tooltipText: SteamState.tooltip
    onPressed: SteamState.toggle()
  }
}
