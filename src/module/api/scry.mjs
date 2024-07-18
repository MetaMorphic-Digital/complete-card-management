const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

/**
 * Scry on a number of cards in a deck, hand, or pile.
 * @param {Cards} deck                                            The deck, hand, or pile on which to spy.
 * @param {object} [options={}]                                   Options that modify the scrying.
 * @param {number} [options.amount=1]                             The number of cards to reveal.
 * @param {number} [options.how=CONST.CARD_DRAW_MODES.FIRST]      From where in the deck to draw the cards to scry on.
 */
export async function scry(deck, {amount = 1, how = CONST.CARD_DRAW_MODES.FIRST} = {}) {
  const cards = deck._drawCards(amount, how);
  ScryDialog.create(cards);
  ChatMessage.implementation.create({
    content: game.i18n.format("CCM.CardSheet.ScryingMessage", {
      name: game.user.name,
      number: cards.length,
      deck: deck.name
    })
  });
  // TODO: replace cards with specific method or in specific order.
}

/**
 * Utility class for scrying.
 */
class ScryDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * @class
   * @param {object} [options]            Application rendering options.
   * @param {Card[]} [options.cards]      The revealed cards.
   */
  constructor({cards, ...options} = {}) {
    super(options);
    this.#cards = cards ?? [];
    this.#deck = cards[0]?.parent ?? null;
  }

  /* -------------------------------------------------- */

  /**
   * Factory method to create an instance of this application.
   * @param {Card[]} cards          The revealed cards.
   * @param {object} [options]      Application rendering options.
   */
  static create(cards, options = {}) {
    options.cards = cards;
    new this(options).render({force: true});
  }

  /* -------------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["ccm", "scry"],
    modal: true,
    rejectClose: false,
    position: {
      width: 600,
      height: "auto"
    },
    window: {
      icon: "fa-solid fa-eye",
      contentClasses: ["standard-form", "scrollable"]
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    cards: {template: "modules/complete-card-management/templates/card/scrying.hbs"}
  };

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = {};
    context.cards = this.#cards;
    return context;
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The cards being revealed.
   * @type {Card[]}
   */
  #cards = null;

  /* -------------------------------------------------- */

  /**
   * The deck from which cards are being revealed.
   * @type {Cards}
   */
  #deck = null;

  /* -------------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format("CCM.CardSheet.ScryingTitle", {name: this.#deck.name});
  }
}
