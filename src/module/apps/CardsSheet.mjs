import {MODULE_ID} from "../helpers.mjs";

/**
 * @import Card from "@client/documents/card.mjs";
 * @import { ApplicationTabsConfiguration } from "@client/applications/_types.mjs";
 */

const {HandlebarsApplicationMixin, DocumentSheetV2} = foundry.applications.api;

/** AppV2 cards sheet (Deck, Hand, Pile) */
export class CardsSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["ccm", "cards"],
    position: {
      width: 620,
      height: "auto"
    },
    actions: {
      toggleGallery: CardsSheet.#onToggleGallery,
      createCard: CardsSheet.#onCreateCard,
      editCard: CardsSheet.#onEditCard,
      deleteCard: CardsSheet.#onDeleteCard,
      shuffleCards: CardsSheet.#onShuffleCards,
      dealCards: CardsSheet.#onDealCards,
      resetCards: CardsSheet.#onResetCards,
      toggleSort: CardsSheet.#onToggleSort,
      previousFace: CardsSheet.#onPreviousFace,
      nextFace: CardsSheet.#onNextFace,
      drawCards: CardsSheet.#onDrawCards,
      passCards: CardsSheet.#onPassCards,
      playCard: CardsSheet.#onPlayCard
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    },
    window: {
      contentClasses: ["standard-form"],
      icon: "fa-solid fa-cards",
      controls: [{
        icon: "fa-solid fa-fw fa-rectangle-vertical-history",
        label: "CCM.CardSheet.GalleryView.ButtonLabel",
        visible: function () {
          // arrow function has `this` as the CardsSheet class rather than instance of class
          // Gallery view is only applicable to the `cards` part we use
          return this.constructor.PARTS.cards;
        },
        action: "toggleGallery"
      }]
    },
    dragDrop: [{dragSelector: "[data-application-part=cards] .cards .card", dropSelector: "[data-application-part=cards] .cards"}]
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  tabGroups = {
    primary: "cards"
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        {
          id: "configuration",
          icon: "fa-solid fa-cogs"
        },
        {
          id: "cards",
          icon: "fa-solid fa-id-badge"
        }
      ],
      initial: "cards",
      labelPrefix: "CCM.CardSheet.Tabs"
    }
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    header: {template: "modules/complete-card-management/templates/card/header.hbs"},
    navigation: {template: "modules/complete-card-management/templates/card/nav.hbs"},
    configuration: {template: "modules/complete-card-management/templates/card/configuration.hbs"},
    cards: {template: "modules/complete-card-management/templates/card/cards.hbs", scrollable: [".cards"]},
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

  /**
   * Is this currently rendering the cards tab in gallery view?
   * Can be modified via render options.
   * @type {boolean}
   */
  #galleryView = false;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if ("galleryView" in options) this.#galleryView = options.galleryView;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.galleryView = this.#galleryView;

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

    // Configuration
    context.img = makeField("img", {
      placeholder: "icons/svg/card-hand.svg",
      value: src.img || ""
    });
    context.description = makeField("description", {
      enriched: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.description, {
        relativeTo: this.document
      })
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

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.dragDrop.forEach((d) => d.bind(this.element));
    this.#setupSearch();
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
  /*   Search filtering                                 */
  /* -------------------------------------------------- */

  /**
   * Current value of the search filter.
   * @type {string}
   */
  #search = null;

  /* -------------------------------------------------- */

  /**
   * Set up search filter.
   */
  #setupSearch() {
    const search = new foundry.applications.ux.SearchFilter({
      inputSelector: "input[type=search]",
      contentSelector: "[data-application-part=cards] .cards",
      initial: this.#search ?? "",
      callback: (event, value, rgx, element) => {
        for (const card of element.querySelectorAll(".card")) {
          let hidden = false;
          const name = card.querySelector(".name").textContent.trim();
          hidden = value && !rgx.test(name);
          card.classList.toggle("hidden", hidden);
        }
        this.#search = value;
      }
    });

    search.bind(this.element);
  }

  /* -------------------------------------------------- */
  /*   Drag and Drop                           */
  /* -------------------------------------------------- */

  #dragDrop = this.#createDragDropHandlers();

  /**
   * An array of DragDrop instances
   */
  get dragDrop() {
    return this.#dragDrop;
  }

  /**
   * Setup drag and drop.
   * @returns {foundry.applications.ux.DragDrop[]}
   */
  #createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: () => this.isEditable,
        drop: () => this.isEditable
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        drop: this._onDrop.bind(this)
      };
      return new foundry.applications.ux.DragDrop.implementation(d);
    });
  }

  /* -------------------------------------------------- */

  /**
   * Handle dragstart event.
   * @param {DragEvent} event     The triggering drag event.
   * @protected
   */
  _onDragStart(event) {
    const id = event.currentTarget.closest("[data-card-id]")?.dataset.cardId;
    const card = this.document.cards.get(id);
    if (card) event.dataTransfer.setData("text/plain", JSON.stringify(card.toDragData()));
  }

  /**
   * The "dragdrop" event handler for individual cards
   * @param {DragEvent} event
   * @protected
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

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Open a Card Gallery for the cards in this stack.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static async #onToggleGallery(event, target) {
    this.render({galleryView: !this.#galleryView, tab: {primary: "cards"}});
  }

  /**
   * Handle creation of a new card.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #onCreateCard(event, target) {
    if (!this.isEditable) return;
    getDocumentClass("Card").createDialog({
      faces: [{}],
      face: 0
    }, {
      parent: this.document,
      pack: this.document.pack
    });
  }

  /* -------------------------------------------------- */

  /**
   * Handle editing a card.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #onEditCard(event, target) {
    const id = target.closest("[data-card-id]").dataset.cardId;
    this.document.cards.get(id).sheet.render({force: true});
  }

  /* -------------------------------------------------- */

  /**
   * Handle deleting a card.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #onDeleteCard(event, target) {
    if (!this.isEditable) return;
    const id = target.closest("[data-card-id]").dataset.cardId;
    this.document.cards.get(id).deleteDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Handle shuffling the order of cards.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #onShuffleCards(event, target) {
    if (!this.isEditable) return;
    this.sort = this.constructor.SORT_TYPES.SHUFFLED;
    this.document.shuffle();
  }

  /* -------------------------------------------------- */

  /**
   * Handle dealing a card.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #onDealCards(event, target) {
    if (!this.isEditable) return;
    this.document.dealDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Handle resetting the card stack.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #onResetCards(event, target) {
    if (!this.isEditable) return;
    this.document.resetDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Handle toggling sort mode.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #onToggleSort(event, target) {
    if (!this.isEditable) return;
    const {SHUFFLED, STANDARD} = this.constructor.SORT_TYPES;
    this.sort = (this.sort === SHUFFLED) ? STANDARD : SHUFFLED;
    this.render();
  }

  /* -------------------------------------------------- */

  /**
   * Handle toggling the face of a card.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #onPreviousFace(event, target) {
    if (!this.isEditable) return;
    const id = target.closest("[data-card-id]").dataset.cardId;
    const card = this.document.cards.get(id);
    card.update({face: (card.face === 0) ? null : card.face - 1});
  }

  /* -------------------------------------------------- */

  /**
   * Handle toggling the face of a card.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #onNextFace(event, target) {
    if (!this.isEditable) return;
    const id = target.closest("[data-card-id]").dataset.cardId;
    const card = this.document.cards.get(id);
    card.update({face: (card.face === null) ? 0 : card.face + 1});
  }

  /* -------------------------------------------------- */

  /**
   * Handle drawing cards.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #onDrawCards(event, target) {
    if (!this.isEditable) return;
    this.document.drawDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Handle passing cards.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #onPassCards(event, target) {
    if (!this.isEditable) return;
    this.document.passDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Handle playing a card.
   * @this {CardsSheet}
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #onPlayCard(event, target) {
    if (!this.isEditable) return;
    const id = target.closest("[data-card-id]").dataset.cardId;
    const card = this.document.cards.get(id);
    this.document.playDialog(card);
  }
}

export class DeckSheet extends CardsSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["deck"],
    actions: {
      recallCard: this.#recallCard,
      viewCard: this.#viewCard
    }
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  tabGroups = {
    primary: "configuration"
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
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

  /**
   * @this DeckSheet
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #recallCard(event, target) {
    const cardId = target.closest("[data-card-id]").dataset.cardId;
    ccm.api.recallCard(this.document, cardId);
  }

  /**
   * @this DeckSheet
   * @param {PointerEvent} event      Triggering click event.
   * @param {HTMLElement} target      The element that defined a [data-action].
   */
  static #viewCard(event, target) {
    const id = target.closest("[data-card-id]").dataset.cardId;
    /** @type {Card} */
    const card = this.document.cards.get(id);
    new foundry.applications.apps.ImagePopout({
      src: card.currentFace?.img ?? card.back.img,
      uuid: card.uuid,
      window: {title: card.name}
    }).render({force: true});
  }
}

export class HandSheet extends CardsSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["hand"]
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.isHand = true;
    if (!this.document.cards.size) context.footer.pass = context.footer.reset = true;
    return context;
  }
}

export class DockedHandSheet extends HandSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["docked", "faded-ui"],
    window: {
      controls: [{
        label: "CARDS.ACTIONS.Draw",
        icon: "fa-solid fa-fw fa-plus",
        action: "drawCards"
      }],
      positioned: false
    },
    dragDrop: [{dragSelector: "[data-application-part=cardList] .cards .card", dropSelector: "[data-application-part=cardList] .cards"}]
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    cardList: {
      template: "modules/complete-card-management/templates/card/docked.hbs"
    }
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onDragStart(event) {
    super._onDragStart(event);
    const img = event.target.querySelector("img");
    const w = 67;
    const h = 100;
    const preview = foundry.applications.ux.DragDrop.createDragImage(img, w, h);
    event.dataTransfer.setDragImage(preview, w / 2, h / 2);
  }
}

export class PileSheet extends CardsSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["pile"]
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.isPile = true;
    if (!this.document.cards.size) context.footer.pass = context.footer.reset = context.footer.shuffle = true;
    return context;
  }
}
