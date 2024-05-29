const {HandlebarsApplicationMixin, DocumentSheetV2} =
  foundry.applications.api;

/**
 * AppV2 cards sheet (Deck, Hand, Pile)
 */
// eslint-disable-next-line new-cap
export default class CardsSheet extends HandlebarsApplicationMixin(
  DocumentSheetV2
) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["ccm", "cards"],
    position: {
      width: 620,
      height: "auto"
    },
    actions: {}
  };

  /** @override */
  static PARTS = {};

  /** @override */
  async _prepareContext(_options) {
    return {
      cards: this.cards,
      source: this.cards.toObject(),
      fields: this.cards.schema.fields
      // systemFields: this.cards.system.schema?.fields, // Unsure if correct to include?
    };
  }

  /**
   * Convenient access to the contained Cards document
   *
   * @returns {Cards} The cards document this sheet represents
   */
  get cards() {
    return this.document;
  }
}
