/**
 * An implementation of the PlaceableHUD base class which renders a heads-up-display interface for {@link CardObject}.
 * This interface provides controls for visibility, attribute bars, elevation, status effects, and more.
 * The CardHUD implementation is stored at {@link CONFIG.Card.hudClass}.
 */
export default class CardHud extends BasePlaceableHUD {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'card-hud',
      template: 'modules/complete-card-management/templates/card-hud.hbs',
    });
  }

  /**
   * Alias for the linked Card document
   *
   * @type {import("../_types.mjs").CardData}
   */
  get card() {
    return this.document;
  }

  /** @override */
  getData(options = {}) {
    const data = super.getData(options);
    return data;
  }

  /** @override */
  activateListeners(jq) {
    super.activateListeners(jq);
    // const html = jq[0]; // For if we want to use base html event listeners
  }
}
