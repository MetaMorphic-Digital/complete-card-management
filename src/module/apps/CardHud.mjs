import CanvasCard from "../canvas/CanvasCard.mjs";
import CardLayer from "../canvas/CardLayer.mjs";
import CardObject from "../canvas/CardObject.mjs";
import {MODULE_ID, generateUpdates, processUpdates} from "../helpers.mjs";

const {api, hud} = foundry.applications;

/**
 * An implementation of the PlaceableHUD base class which renders a heads-up-display interface for {@link CardObject}.
 * This interface provides controls for visibility...
 * The CardHUD implementation is stored at {@link CONFIG.Card.hudClass}.
 * @extends {BasePlaceableHUD<CardObject, CanvasCard, CardLayer>}
 */
export default class CardHud extends api.HandlebarsApplicationMixin(hud.BasePlaceableHUD) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: "card-hud",
    actions: {
      flip: this._onFlip,
      rotate: {handler: this._onRotate, buttons: [0, 2]},
      locked: this._onToggleLocked,
      visibility: this._onToggleVisibility,
      shuffle: this._onShuffle
    }
  };

  /** @override */
  static PARTS = {
    hud: {
      root: true,
      template: "modules/complete-card-management/templates/canvas/card-hud.hbs"
    }
  };

  /**
   * Getter for the source Card or Cards document
   * @type {Card | Cards}
   */
  get card() {
    return this.document.card;
  }

  get _flagPath() {
    return `flags.${MODULE_ID}.${this.object.scene.id}`;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const typeName = this.card.type === CONST.BASE_DOCUMENT_TYPE
      ? this.card.constructor.metadata.label
      : CONFIG[this.card.documentName].typeLabels[this.card.type];
    Object.assign(context, {
      card: this.object.document.card,
      isCardStack: this.object.document.card instanceof Cards,
      lockedClass: this.document.locked ? "active" : "",
      visibilityClass: this.document.hidden ? "active" : "",
      flippedClass: this.document.flipped ? "active" : "",
      flipTooltip: game.i18n.format("CCM.CardLayer.HUD.Flip", {type: game.i18n.localize(typeName)})
    });
    return context;
  }

  /**
   * Actions
   */

  /**
   * Handle click actions to shuffle the deck.
   * @this {CardHUD}
   * @param {PointerEvent} event
   * @param {HTMLButtonElement} target
   */
  static async _onShuffle(event, target) {
    if (!(this.document.card instanceof Cards)) throw new Error("You can only shuffle a card stack");
    return this.document.card.shuffle();
  }

  /**
   * Handle click actions to toggle object visibility.
   * @this {CardHUD}
   * @param {PointerEvent} event
   * @param {HTMLButtonElement} target
   */
  static async _onToggleVisibility(event) {
    event.preventDefault();
    const updates = generateUpdates(
      this._flagPath + ".hidden",
      o => !o,
      {object: this.document, targetPath: "hidden", ignoreLock: true}
    );
    await processUpdates(updates);
  }

  /**
   * Handle click actions to toggle object locked state.
   * @this {CardHUD}
   * @param {PointerEvent} event
   * @param {HTMLButtonElement} target
   */
  static async _onToggleLocked(event) {
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
   * @this {CardHUD}
   * @param {PointerEvent} event The originating click event
   * @param {HTMLButtonElement} target
   */
  static async _onFlip(event, target) {
    let updates;
    if (this.card.documentName === "Card") {
      // TODO: Improve handling for multi-faced cards
      updates = generateUpdates("face", (o) => o === null ? 0 : null, {object: this.card, targetPath: "face"});
    }
    else {
      updates = generateUpdates(
        this._flagPath + ".flipped",
        o => !o,
        {object: this.document, targetPath: "flipped", ignoreLock: true}
      );
    }
    await processUpdates(updates);
  }

  /**
   * Rotate the selected card 90 degrees and all other controlled cards to match
   * Left click rotates clockwise, right click rotates counter-clockwise
   * @this {CardHUD}
   * @param {PointerEvent} event The originating click event
   * @param {HTMLButtonElement} target
   */
  static async _onRotate(event, target) {
    const rotateValue = event.type === "click" ? 90 : -90;
    const updates = generateUpdates(
      this._flagPath + ".rotation",
      (o) => (o ?? 0) + rotateValue,
      {object: this.document, targetPath: "rotation"}
    );
    await processUpdates(updates);
  }
}
