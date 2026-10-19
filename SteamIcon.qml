import QtQuick
import qs.Commons

Item {
  id: root

  property real iconWidth: Style.space(17)
  property color color: Color.foreground

  // The classic Steam piston, drawn in a 468x273 box: a left joint linked by
  // a rod to a middle joint, then a tapered arm up to the big ring. Each
  // joint has a ring cut clean through, so the bar shows through like the
  // logo's dark rings. The rings are a little thicker than the original so
  // they survive at bar size.
  readonly property real viewX: 22
  readonly property real viewY: 105
  readonly property real viewW: 468
  readonly property real viewH: 273

  width: iconWidth
  height: iconWidth * viewH / viewW
  implicitWidth: width
  implicitHeight: height

  onColorChanged: canvas.requestPaint()

  Canvas {
    id: canvas
    anchors.fill: parent
    antialiasing: true

    readonly property var leftJoint: [91, 230]
    readonly property var midJoint: [268, 318]
    readonly property var bigJoint: [400, 195]

    function disc(ctx, c, r) {
      ctx.beginPath()
      ctx.arc(c[0], c[1], r, 0, Math.PI * 2)
      ctx.fill()
    }

    function ring(ctx, c, inner, thickness) {
      ctx.beginPath()
      ctx.lineWidth = thickness
      ctx.arc(c[0], c[1], inner + thickness / 2, 0, Math.PI * 2)
      ctx.stroke()
    }

    function rod(ctx) {
      ctx.beginPath()
      ctx.lineWidth = 66
      ctx.lineCap = "round"
      ctx.moveTo(leftJoint[0], leftJoint[1])
      ctx.lineTo(midJoint[0], midJoint[1])
      ctx.stroke()
    }

    // Tapered arm: the outer tangents of the middle and big joints.
    function arm(ctx) {
      var dx = bigJoint[0] - midJoint[0], dy = bigJoint[1] - midJoint[1]
      var d = Math.sqrt(dx * dx + dy * dy)
      var px = -dy / d, py = dx / d
      ctx.beginPath()
      ctx.moveTo(midJoint[0] + px * 40, midJoint[1] + py * 40)
      ctx.lineTo(bigJoint[0] + px * 66, bigJoint[1] + py * 66)
      ctx.lineTo(bigJoint[0] - px * 66, bigJoint[1] - py * 66)
      ctx.lineTo(midJoint[0] - px * 40, midJoint[1] - py * 40)
      ctx.closePath()
      ctx.fill()
    }

    onPaint: {
      var ctx = getContext("2d")
      ctx.reset()
      ctx.scale(width / root.viewW, height / root.viewH)
      ctx.translate(-root.viewX, -root.viewY)
      ctx.fillStyle = root.color
      ctx.strokeStyle = root.color

      disc(ctx, leftJoint, 61)
      disc(ctx, midJoint, 52)
      disc(ctx, bigJoint, 82)
      arm(ctx)

      ctx.globalCompositeOperation = "destination-out"
      ring(ctx, leftJoint, 33, 18)
      ring(ctx, midJoint, 34, 18)

      ctx.globalCompositeOperation = "source-over"
      rod(ctx)
      arm(ctx)

      ctx.globalCompositeOperation = "destination-out"
      ring(ctx, bigJoint, 36, 24)
    }
  }
}
