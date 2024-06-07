import CanvasCard from "../canvas/CanvasCard.mjs";
import CardLayer from "../canvas/CardLayer.mjs";
import CardObject from "../canvas/CardObject.mjs";
import {MODULE_ID, processUpdates} from "../helpers.mjs";

/**
 * An implementation of the PlaceableHUD base class which renders a heads-up-display interface for {@link CardObject}.
 * This interface provides controls for visibility...
 * The CardHUD implementation is stored at {@link CONFIG.Card.hudClass}.
 * @extends {BasePlaceableHUD<CardObject, CanvasCard, CardLayer>}
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
    data.lockedClass = this.document.locked ? "active" : "";
    data.visibilityClass = this.document.hidden ? "active" : "";
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
  }

  async _onToggleLocked(event) {
    event.preventDefault();

    const updates = this.#generateUpdates(`flags.${MODULE_ID}.${this.object.scene.id}.locked`, !this.object.document.locked);

    await processUpdates(updates);
  }

  /**
   * Generates a record that can be forwarded to processUpdates
   * @param {string} valuePath - Path for the value in dot notation
   * @param {any} newValue     - Value to set all documents to
   * @returns {Record<string, Array<{ _id: string } & Record<string, unknown>>>} A record with the _id and update info
   */
  #generateUpdates(valuePath, newValue) {
    const updates = this.layer.controlled.reduce((cards, o) => {
      const d = fromUuidSync(o.id);
      const parentSlot = cards[d.parent.id];
      const updateData = {
        _id: d.id
      };
      foundry.utils.setProperty(updateData, valuePath, newValue);
      if (parentSlot) parentSlot.push(updateData);
      else cards[d.parent.id] = [updateData];
      return cards;
    }, {});

    return updates;
  }
}
