const {DocumentSheet, HandlebarsApplicationMixin} = foundry.applications.api;

/**
 * A gallery of cards.
 */
export default class CardGallery extends HandlebarsApplicationMixin(DocumentSheet) {
  static DEFAULT_OPTIONS = {
    classes: ["ccm", "card-gallery"],
    position: {
      width: 600,
      top: 100,
      height: "auto"
    },
    window: {
      icon: "fa-solid fa-rectangle-vertical-history",
      contentClasses: ["standard-form"]
    },
    actions: {
      playCard: this.#playCard
    },
    sheetConfig: false
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    cards: {template: "modules/complete-card-management/templates/card/gallery.hbs"}
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    return {
      cards: this.document.cards
    };
  }

  /* -------------------------------------------------- */

  /**
   * Play a card from the dialog
   * @this {CardGallery}
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The data-action element.
   */
  static async #playCard(event, target) {
    const figure = target.closest("[data-card-id]");
    const cardId = figure.dataset.cardId;
    const card = this.document.cards.get(cardId);
    const play = await this.document.playDialog(card);
    if (play) await this.render();
  }

}
