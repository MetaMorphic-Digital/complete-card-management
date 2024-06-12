import CCM_CONFIG from "../config.mjs";
import {MODULE_ID} from "../helpers.mjs";
const fields = foundry.data.fields;

export default class MoveCardBehavior extends foundry.data.regionBehaviors.RegionBehaviorType {

  static LOCALIZATION_PREFIXES = ["CCM.MoveCardBehavior"];

  static defineSchema() {
    return {
      targetStack: new fields.ForeignDocumentField(getDocumentClass("Cards"))
    };
  }

  /** @override */
  static _createEventsField({events, initial} = {}) {
    const setFieldOptions = {
      label: "BEHAVIOR.TYPES.base.FIELDS.events.label",
      hint: "BEHAVIOR.TYPES.base.FIELDS.events.hint"
    };
    if (initial) setFieldOptions.initial = initial;
    return new fields.SetField(new fields.StringField({
      required: true,
      choices: {
        [CCM_CONFIG.REGION_EVENTS.CARD_MOVE_OUT]: "CCM.REGION_EVENTS.CardMoveOut.label",
        [CCM_CONFIG.REGION_EVENTS.CARD_MOVE_IN]: "CCM.REGION_EVENTS.CardMoveIn.label"
      }
    }), setFieldOptions);
  }

  /** @override */
  static events = {
    [CCM_CONFIG.REGION_EVENTS.CARD_MOVE_IN]: this.#onCardMoveIn,
    [CCM_CONFIG.REGION_EVENTS.CARD_MOVE_OUT]: this.#onCardMoveOut
  };

  /**
   *
   * @this MoveCardBehavior
   * @param {RegionEvent} event
   */
  static async #onCardMoveIn(event) {
    const userCanUpdate = canvas.scene.testUserPermission(event.user, "update");
    const isResponsible = (userCanUpdate && event.user.isSelf) || (!userCanUpdate && game.users.activeGM.isSelf);
    if (!userCanUpdate && !game.users.activeGM) return ui.notifications.error("No active GM to manage scene data!");
    const {card} = event.data;
    if (this.targetStack && (this.targetStack !== card.parent) && isResponsible) {
      ui.notifications.info(`Adding ${card.name} to ${this.targetStack.name}`);
      const newCard = await card.pass(this.targetStack);
      const sceneCards = foundry.utils.deepClone(canvas.scene.getFlag(MODULE_ID, "cardCollection") ?? []);
      sceneCards.findSplice(uuid => uuid === card.uuid, newCard.uuid);
      canvas.scene.setFlag(MODULE_ID, "cardCollection", sceneCards);
    }
  }

  /**
   *
   * @this MoveCardBehavior
   * @param {RegionEvent} event
   */
  static async #onCardMoveOut(event) {
    const {card} = event.data;
    if (this.targetStack && (this.targetStack !== card.parent) && event.user.isSelf) {
      ui.notifications.info(`Removing ${event.data.card.name} from ${this.targetStack.name}`);
    }
  }
}
