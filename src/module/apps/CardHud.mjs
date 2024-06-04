import {MODULE_ID, processUpdates} from "../helpers.mjs";

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
   * Getter for the source Card document
   */
  get card() {
    return this.document.card;
  }

  /** @override */
  getData(options = {}) {
    const data = super.getData(options);
    return data;
  }

  /** @override */
  setPosition(options = {}) {
    const {x, y, width, height} = this.object.frame.bounds;
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

  /**
   * Actions
   */

  /** @override */
  activateListeners(jq) {
    super.activateListeners(jq);
    // const html = jq[0]; // For if we want to use base html event listeners
  }

  async _onToggleVisibility(event) {
    event.preventDefault();

    const updates = this.#generateUpdates(`flags.${MODULE_ID}.${this.object.scene.id}.hidden`, !this.object.document.hidden);

    await processUpdates(updates);
    // There's probably a more performant method that uses render() with a bunch of other handling
    canvas.interface.draw();
  }

  async _onToggleLocked(event) {
    event.preventDefault();

    const updates = this.#generateUpdates(`flags.${MODULE_ID}.${this.object.scene.id}.locked`, !this.object.document.locked);

    await processUpdates(updates);
    // There's probably a more performant method that uses render() with a bunch of other handling
    canvas.interface.draw();
  }

  #generateUpdates(targetPath, newValue) {

    const updates = this.layer.controlled.reduce((cards, o) => {
      const d = fromUuidSync(o.id);
      const parentSlot = cards[d.parent.id];
      const updateData = {
        _id: d.id
      };
      foundry.utils.setProperty(updateData, targetPath, newValue);
      if (parentSlot) parentSlot.push(updateData);
      else cards[d.parent.id] = [updateData];
      return cards;
    }, {});

    return updates;
  }
}
