import CCM_CONFIG from "../config.mjs";
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
    console.log("Card moved in", event, this);
  }

  /**
   *
   * @this MoveCardBehavior
   * @param {RegionEvent} event
   */
  static async #onCardMoveOut(event) {
    console.log("Card moved out", event, this);
  }
}
