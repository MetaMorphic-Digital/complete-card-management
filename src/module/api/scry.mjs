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
      top: 100,
      height: "auto"
    },
    window: {
      icon: "fa-solid fa-eye",
      contentClasses: ["standard-form", "scrollable"]
    },
    actions: {
      shuffleReplace: this.#shuffleCards,
      confirm: this.#confirm,
      playCard: this.#playCard
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

  /** @override */
  _onRender(...T) {
    super._onRender(...T);
    // Can't rearrange random pulls
    if (this.#how !== CONST.CARD_DRAW_MODES.RANDOM) this.#setupDragDrop();
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

  /**
   * A getter to align functionality with proper deck sheets
   * @returns {Cards}
   */
  get document() {
    return this.#deck;
  }

  /* -------------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format("CCM.CardSheet.ScryingTitle", {name: this.#deck.name});
  }

  /* -------------------------------------------------- */
  /*   Drag and drop handlers                           */
  /* -------------------------------------------------- */

  /**
   * Set up drag and drop.
   */
  #setupDragDrop() {
    const dd = new DragDrop({
      dragSelector: "[data-card-id]",
      dropSelector: "fieldset.cards",
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        drop: this._onDrop.bind(this)
      }
    });
    dd.bind(this.element);
  }

  /* -------------------------------------------------- */

  /**
   * Handle dragstart event.
   * @param {DragEvent} event     The triggering drag event.
   */
  _onDragStart(event) {
    const id = event.currentTarget.closest("[data-card-id]")?.dataset.cardId;
    const card = this.#deck.cards.get(id);
    if (card) event.dataTransfer.setData("text/plain", JSON.stringify(card.toDragData()));
  }

  /* -------------------------------------------------- */

  /**
   * Drag and drop the
   * @param {DragEvent} event     The triggering drag event.
   */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    if (data.type !== "Card") return;
    const card = await Card.implementation.fromDropData(data);
    if (card.parent.id !== this.document.id) {
      ui.notifications.error("CCM.Warning.NoScryDrop", {localize: true});
      return;
    }
    const currentIndex = this.#cards.findIndex(c => c.id === card.id);
    /** @type {HTMLElement} */
    const target = event.target.closest("[data-card-id]");
    const targetCard = this.document.cards.get(target?.dataset.cardId);
    if (card.id === targetCard) return; // Don't sort on self
    if (targetCard) {
      const targetIndex = this.#cards.findIndex(c => c.id === targetCard.id);
      this.#cards.splice(targetIndex, 0, this.#cards.splice(currentIndex, 1)[0]);
    }

    return this.render();
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
   * Play a card from the dialog
   * @this {ScryDialog}
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The data-action element.
   */
  static async #playCard(event, target) {
    const figure = target.closest("[data-card-id]");
    const cardId = figure.dataset.cardId;
    const card = this.#deck.cards.get(cardId);
    const play = await this.#deck.playDialog(card);
    if (play) {
      this.#cards.findSplice(c => c.id === cardId);
      this.render();
    }
  }

  /* -------------------------------------------------- */

  /**
   * Close the application with the Confirm button.
   * @this {ScryDialog}
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      The data-action element.
   */
  static async #confirm(event, target) {
    if (this.#how !== CONST.CARD_DRAW_MODES.RANDOM) {
      const startIndex = this.#how === CONST.CARD_DRAW_MODES.FIRST ? 0 : this.#deck.cards.size - this.#cards.length;
      const updates = this.#cards.map((c, index) => ({
        _id: c._id,
        sort: index + startIndex
      }));
      await this.#deck.updateEmbeddedDocuments("Card", updates);
    }
    this.close();
  }
}
