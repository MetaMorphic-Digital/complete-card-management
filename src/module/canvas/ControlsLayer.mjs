import CardLayer from "./CardLayer.mjs";

/**
 * A custom subclass of the controls layer that adds the ability to ping while on the cards layer.
 */
export default class CCMControlsLayer extends CONFIG.Canvas.layers.controls.layerClass {
  /** @inheritdoc */
  _onLongPress(event, origin) {
    if (canvas.activeLayer instanceof CardLayer) {
      const isCtrl = game.keyboard.isModifierActive("CONTROL");
      if (!game.user.hasPermission("PING_CANVAS") || isCtrl) return;
      event.interactionData.cancelled = true;
      canvas.currentMouseManager.cancel(event); // Cancel drag workflow
      return canvas.ping(origin);
    }
    else return super._onLongPress(event, origin);
  }
}
