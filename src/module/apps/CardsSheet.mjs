import {MODULE_ID} from "../helpers.mjs";

const {HandlebarsApplicationMixin, DocumentSheetV2} = foundry.applications.api;

/** AppV2 cards sheet (Deck, Hand, Pile) */
class CardsSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["ccm", "cards"],
    position: {
      width: 620,
      height: "auto"
    },
    actions: {
      createCard: this._onCreateCard,
      editCard: this._onEditCard,
      deleteCard: this._onDeleteCard,
      shuffleCards: this._onShuffleCards,
      dealCards: this._onDealCards,
      resetCards: this._onResetCards,
      toggleSort: this._onToggleSort,
      previousFace: this._onPreviousFace,
      nextFace: this._onNextFace,
      drawCards: this._onDrawCards,
      passCards: this._onPassCards,
      playCard: this._onPlayCard
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    },
    window: {
      contentClasses: ["standard-form"],
      icon: "fa-solid fa-cards"
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "cards"
  };

  /* -------------------------------------------------- */

  /**
   * Tabs that are present on this sheet.
   * @enum {TabConfiguration}
   */
  static TABS = {
    configuration: {
      id: "configuration",
      group: "primary",
      label: "CCM.CardSheet.TabConfiguration",
      icon: "fa-solid fa-cogs"
    },
    cards: {
      id: "cards",
      group: "primary",
      label: "CCM.CardSheet.TabCards",
      icon: "fa-solid fa-id-badge"
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {template: "modules/complete-card-management/templates/card/header.hbs"},
    navigation: {template: "modules/complete-card-management/templates/card/nav.hbs"},
    configuration: {template: "modules/complete-card-management/templates/card/configuration.hbs"},
    cards: {template: "modules/complete-card-management/templates/card/cards.hbs", scrollable: [""]},
    footer: {template: "modules/complete-card-management/templates/card/cards-footer.hbs"}
  };

  /* -------------------------------------------------- */

  /**
   * The allowed sorting methods which can be used for this sheet.
   * @enum {string}
   */
  static SORT_TYPES = {
    STANDARD: "standard",
    SHUFFLED: "shuffled"
  };

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = {};
    const src = this.document.toObject();

    const makeField = (name, options = {}) => {
      const document = options.document ?? this.document;
      const schema = options.schema ?? document.schema;

      return {
        field: schema.getField(name),
        value: foundry.utils.getProperty(document, name),
        ...options
      };
    };

    // Header
    context.name = makeField("name");
    context.currentFace = this.document.img;

    // Navigation
    context.tabs = Object.values(this.constructor.TABS).reduce((acc, v) => {
      const isActive = this.tabGroups[v.group] === v.id;
      acc[v.id] = {
        ...v,
        active: isActive,
        cssClass: isActive ? "item active" : "item",
        tabCssClass: isActive ? "tab scrollable active" : "tab scrollable"
      };
      return acc;
    }, {});

    // Configuration
    context.img = makeField("img", {
      placeholder: "icons/svg/card-hand.svg",
      value: src.img || ""
    });
    context.description = makeField("description", {
      enriched: await TextEditor.enrichHTML(this.document.description, {relativeTo: this.document})
    });
    context.width = makeField("width", {placeholder: game.i18n.localize("Width")});
    context.height = makeField("height", {placeholder: game.i18n.localize("Height")});
    context.rotation = makeField("rotation", {
      placeholder: game.i18n.localize("Rotation"),
      value: this.document.rotation || ""
    });
    context.primaryOwner = {
      field: new foundry.data.fields.ForeignDocumentField(User, {
        label: "CCM.CardSheet.PrimaryOwner"
      }, {name: `flags.${MODULE_ID}.primaryOwner`}),
      value: (options.document ?? this.document).getFlag(MODULE_ID, "primaryOwner")
    };

    // Cards
    const sortFn = {
      standard: this.document.sortStandard,
      shuffled: this.document.sortShuffled
    }[this.sort || "standard"];
    const cards = this.document.cards.contents.sort((a, b) => sortFn.call(this.document, a, b)).map(card => {
      const show = (this.document.type === "deck") || !!card.currentFace;
      return {
        card: card,
        type: show ? game.i18n.localize(CONFIG.Card.typeLabels[card.type]) : null,
        suit: show ? card.suit : null,
        value: show ? card.value : null
      };
    });
    context.cards = cards;

    // Footer
    context.footer = {
      pass: false,
      reset: false,
      shuffle: false,
      deal: false,
      draw: false
    };

    return context;
  }

  /* -------------------------------------------------- */

  /** @override */
  _onRender(...T) {
    super._onRender(...T);
    this.#setupDragDrop();
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * Convenient access to the contained Cards document.
   * @type {Cards} The cards document this sheet represents.
   */
  get cards() {
    return this.document;
  }
  get object() {
    // Compatibility with CardsConfig prototype methods.
    return this.document;
  }

  /* -------------------------------------------------- */

  /**
   * The current sorting method of this deck.
   * @type {string}
   */
  #sort = "shuffled";
  get sort() {
    return this.#sort;
  }
  set sort(mode) {
    if (Object.values(this.constructor.SORT_TYPES).includes(mode)) {
      this.#sort = mode;
    }
  }

  /* -------------------------------------------------- */
  /*   Drag and drop handlers                           */
  /* -------------------------------------------------- */

  #setupDragDrop() {
    const sheet = this;
    const dd = new DragDrop({
      dragSelector: (this.document.type === "deck") ? "ol.cards li.card" : "ol.cards li.card .name",
      dropSelector: "ol.cards",
      permissions: {
        dragstart: () => sheet.isEditable,
        drop: () => sheet.isEditable
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        drop: CardsConfig.prototype._onDrop.bind(sheet)
      }
    });
    dd.bind(this.element);
  }

  /* -------------------------------------------------- */

  _onDragStart(event) {
    const id = event.currentTarget.closest("[data-card-id]")?.dataset.cardId;
    const card = this.document.cards.get(id);
    if (card) event.dataTransfer.setData("text/plain", JSON.stringify(card.toDragData()));
  }

  /* -------------------------------------------------- */

  _onSortCard(event, card) {
    CardsConfig.prototype._onSortCard.call(this, event, card);
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  static _onCreateCard(event, target) {
    Card.implementation.createDialog({
      faces: [{}],
      face: 0
    }, {
      parent: this.document,
      pack: this.document.pack
    });
  }

  /* -------------------------------------------------- */

  static _onEditCard(event, target) {
    const id = target.closest("[data-card-id]").dataset.cardId;
    this.document.cards.get(id).sheet.render({force: true});
  }

  /* -------------------------------------------------- */

  static _onDeleteCard(event, target) {
    const id = target.closest("[data-card-id]").dataset.cardId;
    this.document.cards.get(id).deleteDialog();
  }

  /* -------------------------------------------------- */

  static _onShuffleCards(event, target) {
    this.sort = this.constructor.SORT_TYPES.SHUFFLED;
    this.document.shuffle();
  }

  /* -------------------------------------------------- */

  static _onDealCards(event, target) {
    this.document.dealDialog();
  }

  /* -------------------------------------------------- */

  static _onResetCards(event, target) {
    this.document.resetDialog();
  }

  /* -------------------------------------------------- */

  static _onToggleSort(event, target) {
    const {SHUFFLED, STANDARD} = this.constructor.SORT_TYPES;
    this.sort = (this.sort === SHUFFLED) ? STANDARD : SHUFFLED;
    this.render();
  }

  /* -------------------------------------------------- */

  static _onPreviousFace(event, target) {
    const id = target.closest("[data-card-id]").dataset.cardId;
    const card = this.document.cards.get(id);
    card.update({face: (card.face === 0) ? null : card.face - 1});
  }

  /* -------------------------------------------------- */

  static _onNextFace(event, target) {
    const id = target.closest("[data-card-id]").dataset.cardId;
    const card = this.document.cards.get(id);
    card.update({face: (card.face === null) ? 0 : card.face + 1});
  }

  /* -------------------------------------------------- */

  static _onDrawCards(event, target) {
    this.document.drawDialog();
  }

  /* -------------------------------------------------- */

  static _onPassCards(event, target) {
    this.document.passDialog();
  }

  /* -------------------------------------------------- */

  static _onPlayCard(event, target) {
    const id = target.closest("[data-card-id]").dataset.cardId;
    const card = this.document.cards.get(id);
    this.document.playDialog(card);
  }
}

export class DeckSheet extends CardsSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["deck"],
    actions: {
      recallCard: this.#recallCard
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "configuration"
  };

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.isDeck = true;
    if (!this.document.cards.size) context.footer.shuffle;
    if (!this.document.drawnCards.length) context.footer.reset = true;
    if (!this.document.availableCards.length) context.footer.deal = true;
    return context;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  static #recallCard(event, target) {
    const cardId = target.closest("[data-card-id]").dataset.cardId;
    ccm.api.recallCard(this.document, cardId);
  }
}

export class HandSheet extends CardsSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["hand"]
  };

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.isHand = true;
    if (!this.document.cards.size) context.footer.pass = context.footer.reset = true;
    return context;
  }
}

export class PileSheet extends CardsSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["pile"]
  };

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.isPile = true;
    if (!this.document.cards.size) context.footer.pass = context.footer.reset = context.footer.shuffle = true;
    return context;
  }
}
