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
  const application = ScryDialog.create(cards, {how});
  ChatMessage.implementation.create({
    content: game.i18n.format("CCM.CardSheet.ScryingMessage", {
      name: game.user.name,
      number: cards.length,
      deck: deck.name
    })
  });
  return application;
  // TODO: replace cards with specific method or in specific order.
}

/**
 * Utility class for scrying.
 */
class ScryDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * @class
   * @param {object} [options]                                      Application rendering options.
   * @param {Card[]} [options.cards]                                The revealed cards.
   * @param {number} [options.how=CONST.CARD_DRAW_MODES.FIRST]      From where in the deck to draw the cards to scry on.
   */
  constructor({cards, how, ...options} = {}) {
    super(options);
    this.#cards = cards ?? [];
    this.#deck = cards[0]?.parent ?? null;
    this.#how = how;
  }

  /* -------------------------------------------------- */

  /**
   * Factory method to create an instance of this application.
   * @param {Card[]} cards                                          The revealed cards.
   * @param {object} [options]                                      Application rendering options.
   * @param {number} [options.how=CONST.CARD_DRAW_MODES.FIRST]      From where in the deck to draw the cards to scry on.
   * @returns {Promise<ScryDialog>}                                 A promise resolving to the created application instance.
   */
  static create(cards, {how = CONST.CARD_DRAW_MODES.FIRST, ...options} = {}) {
    const application = new this({cards, how, ...options});
    application.render({force: true});
    return application;
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
    },
    actions: {
      shuffleReplace: this.#shuffleCards,
      close: this.#onClose
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    cards: {template: "modules/complete-card-management/templates/card/scrying.hbs"},
    footer: {template: "modules/complete-card-management/templates/card/scrying-footer.hbs"}
  };

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = {};
    context.cards = this.#cards;
    context.shuffle = this.#how !== CONST.CARD_DRAW_MODES.RANDOM;
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
   * Reference to the method in which the cards were drawn from the deck.
   * @type {number}
   */
  #how = null;

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

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Shuffle the order of the revealed cards.
   * @this {ScryDialog}
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The data-action element.
   */
  static #shuffleCards(event, target) {
    // Cannot shuffle back in randomly drawn cards yet.
    if (this.#how === CONST.CARD_DRAW_MODES.RANDOM) return;

    this.close();
    const {min, max} = this.#cards.reduce((acc, card) => {
      const sort = card.sort;
      acc.min = Math.min(acc.min, sort);
      acc.max = Math.max(acc.max, sort);
      return acc;
    }, {min: Infinity, max: -Infinity});

    const order = Array.fromRange(max - min + 1, min)
      .map(n => ({value: n, sort: Math.random()}))
      .sort((a, b) => a.sort - b.sort)
      .map(o => o.value);

    const updates = this.#cards.map((card, i) => {
      return {_id: card.id, sort: order[i]};
    });

    const canPerform = this.#deck.isOwner;
    if (canPerform) this.#deck.updateEmbeddedDocuments("Card", updates);
    else {
      const userId = game.users.find(u => u.active && this.#deck.testUserPermission(u, "OWNER"))?.id;
      if (!userId) {
        ui.notifications.warn("CCM.Warning.DeckOwnerNotFound", {localize: true});
        return;
      }
      ccm.socket.emit("updateEmbeddedCards", {
        userId: userId,
        updates: updates,
        uuid: this.#deck.uuid
      });
    }
    ChatMessage.implementation.create({
      content: game.i18n.format("CCM.CardSheet.ScryingMessageReorder", {
        name: game.user.name,
        number: this.#cards.length,
        deck: this.#deck.name
      })
    });
  }

  /* -------------------------------------------------- */

  /**
   * Close the application.
   * @this {ScryDialog}
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The data-action element.
   */
  static #onClose(event, target) {
    this.close();
  }
}
