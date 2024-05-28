const { HandlebarsApplicationMixin, DocumentSheetV2 } =
  foundry.applications.api;

/**
 * AppV2 card sheet
 */
// eslint-disable-next-line new-cap
export default class CardSheet extends HandlebarsApplicationMixin(
  DocumentSheetV2
) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['ccm', 'card'],
    position: {
      width: 620,
      height: 'auto',
    },
    actions: {},
  };

  /** @override */
  static PARTS = {};

  /** @override */
  async _prepareContext(_options) {
    return {
      cards: this.card,
      source: this.card.toObject(),
      fields: this.card.schema.fields,
      // systemFields: this.card.system.schema?.fields, // Unsure if correct to include?
    };
  }

  /**
   * Convenient access to the contained Cards document
   *
   * @returns {Cards} The cards document this sheet represents
   */
  get card() {
    return this.document;
  }
}
