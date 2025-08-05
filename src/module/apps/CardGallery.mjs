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
      playCard: this.#playCard,
      recallCard: this.#recallCard
    },
    sheetConfig: false
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    cards: {
      template: "modules/complete-card-management/templates/card/gallery.hbs",
      scrollable: [""]
    }
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    return {
      cards: Array.from(this.document.cards).sort((a, b) => a.sort - b.sort)
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#setupDragDrop();
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Play a card from the dialog
   * @this CardGallery
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

  /* -------------------------------------------------- */

  /**
   * @this CardGallery
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #recallCard(event, target) {
    const cardId = target.closest("[data-card-id]").dataset.cardId;
    ccm.api.recallCard(this.document, cardId);
  }

  /* -------------------------------------------------- */
  /*   Drag and drop handlers                           */
  /* -------------------------------------------------- */

  /**
   * Set up drag and drop.
   */
  #setupDragDrop() {
    const dd = new foundry.applications.ux.DragDrop({
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
    const card = this.document.cards.get(id);
    if (card) event.dataTransfer.setData("text/plain", JSON.stringify(card.toDragData()));
  }

  /* -------------------------------------------------- */

  /**
   * Drag and drop the
   * @param {DragEvent} event     The triggering drag event.
   */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data.type !== "Card") return;
    const card = await getDocumentClass("Card").fromDropData(data);
    const stack = this.document;
    if (card.parent.id === stack.id) return this.#onSortCard(event, card);
    try {
      return await card.pass(stack);
    } catch (err) {
      Hooks.onError("CardsConfig##onDrop", err, {log: "error", notify: "error"});
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle sorting a Card relative to other siblings within this document
   * @param {Event} event     The drag drop event
   * @param {Card} card       The card being dragged
   */
  async #onSortCard(event, card) {
    const stack = this.document;
    const li = event.target.closest("[data-card-id]");
    const target = stack.cards.get(li?.dataset.cardId);
    if (!target || (card === target)) return;
    const siblings = stack.cards.filter(c => c.id !== card.id);
    const updateData = foundry.utils.performIntegerSort(card, {target, siblings})
      .map(u => ({_id: u.target.id, sort: u.update.sort}));
    await stack.updateEmbeddedDocuments("Card", updateData);
  }

}
