/**
 * An implementation of the PlaceableHUD base class which renders a heads-up-display interface for {@link CardObject}.
 * This interface provides controls for visibility...
 * The CardHUD implementation is stored at {@link CONFIG.Card.hudClass}.
 */
export default class CardHud extends BasePlaceableHUD {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "card-hud",
      template: "modules/complete-card-management/templates/canvas/card-hud.hbs"
    });
  }

  /**
   * Alias for the linked CanvasCard synthetic document
   *
   * @type {import('../canvas/CanvasCard.mjs').default}
   */
  get card() {
    return this.document;
  }

  /** @override */
  getData(options = {}) {
    const data = super.getData(options);
    console.log(data);
    return data;
  }

  /** @override */
  setPosition(options) {
    let {x, y, width, height} = this.object.frame.bounds;
    const c = 70;
    const p = 10;
    const position = {
      width: width + (c * 2) + (p * 2),
      height: height + (p * 2),
      left: x + this.object.x - c - p,
      top: y + this.object.y - p
    };
    this.element.css(position);
  }

  /** @override */
  activateListeners(jq) {
    super.activateListeners(jq);
    // const html = jq[0]; // For if we want to use base html event listeners
  }
}
