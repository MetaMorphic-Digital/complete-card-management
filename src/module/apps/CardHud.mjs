import CanvasCard from "../canvas/CanvasCard.mjs";
import CardLayer from "../canvas/CardLayer.mjs";
import CardObject from "../canvas/CardObject.mjs";
import {MODULE_ID, generateUpdates, processUpdates} from "../helpers.mjs";

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
   * @type {Card}
   */
  get card() {
    return this.document.card;
  }

  get _flagPath() {
    return `flags.${MODULE_ID}.${this.object.scene.id}`;
  }

  /** @override */
  getData(options = {}) {
    const data = super.getData(options);
    data.card = this.object.document.card;
    data.isCardStack = this.object.document.card instanceof Cards;
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
    /** @type {HTMLElement} */
    const html = jq[0];
    html.querySelector("[data-action='rotate']").addEventListener("contextmenu", this._onRotate.bind(this));
  }

  /** @override */
  _onClickControl(event) {
    super._onClickControl(event);
    const button = event.currentTarget;
    switch (button.dataset.action) {
      case "flip":
        return this._onFlip(event);
      case "rotate":
        return this._onRotate(event);
      case "shuffle":
        if (!(this.document.card instanceof Cards)) console.error("You can only shuffle a card stack");
        return this.document.card.shuffle();
    }
  }

  async _onToggleVisibility(event) {
    event.preventDefault();
    const updates = generateUpdates(
      this._flagPath + ".hidden",
      o => !o,
      {object: this.document, targetPath: "hidden", ignoreLock: true}
    );
    await processUpdates(updates);
  }

  async _onToggleLocked(event) {
    event.preventDefault();
    const updates = generateUpdates(
      this._flagPath + ".locked",
      o => !o,
      {object: this.document, targetPath: "locked", ignoreLock: true}
    );
    await processUpdates(updates);
  }

  /**
   * Flips the selected card and all other controlled cards to match
   * @param {PointerEvent} event The originating click event
   */
  async _onFlip(event) {
    event.preventDefault();
    // TODO: Improve handling for multi-faced cards
    const updates = generateUpdates("face", (o) => o === null ? 0 : null, {object: this.card, targetPath: "face"});
    await processUpdates(updates);
  }

  /**
   * Rotate the selected card 90 degrees and all other controlled cards to match
   * Left click rotates clockwise, right click rotates counter-clockwise
   * @param {PointerEvent} event The originating click event
   */
  async _onRotate(event) {
    event.preventDefault();
    const rotateValue = event.type === "click" ? 90 : -90;
    const updates = generateUpdates(
      this._flagPath + ".rotation",
      (o) => (o ?? 0) + rotateValue,
      {object: this.document, targetPath: "rotation"}
    );
    await processUpdates(updates);
  }
}
