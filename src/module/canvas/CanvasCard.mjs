
import {MODULE_ID} from "../helpers.mjs";

/**
 * @import Color from "@common/utils/color.mjs"
 * @import DocumentSheetV2 from "@client/applications/api/document-sheet.mjs";
 * @import {Card, Cards} from "@client/documents/_module.mjs"
 * @import CardLayer from "./CardLayer.mjs";
 * @import CardObject from "./CardObject.mjs";
 */

/**
 * A data model that captures the necessary characteristics for a CardObject on the canvas
 * Contains many properties to enable functionality as a synthetic document
 */
export default class CanvasCard extends foundry.abstract.DataModel {
  /**
   * @param {Card | Cards} card The document represented by this data model
   */
  constructor(card) {
    if (!((card instanceof Card) || (card instanceof Cards))) {
      throw new Error("The card object model takes a Card document as its only argument");
    }

    const data = card.getFlag(MODULE_ID, canvas.scene?.id);

    if (!data) {
      throw new Error("The card doesn't have location data for the current scene");
    }

    let img = card.img;

    if ((card instanceof Cards) && data.flipped) {
      try {
        const [bottomCard] = card._drawCards(1, CONST.CARD_DRAW_MODES.BOTTOM);
        img = bottomCard.img;
      }
      catch {
        console.error("Failed to flip deck", card.name);
      }
    }

    Object.assign(data, {
      texture: {
        src: img
      },
      width: (card.width ?? 2) * canvas.grid.sizeX,
      height: (card.height ?? 3) * canvas.grid.sizeY
    });

    super(data, {parent: canvas.scene});

    /**
     * A reference to the card or cards document this takes data from.
     * @type {Card | Cards}
     */
    this.card = card;
  }

  /* -------------------------------------------------- */

  /**
   * Synthetic parent
   * @type {Scene}
   */
  // Using this.parent so that way it sticks after constructor.
  parent = this.parent ?? null;

  /* -------------------------------------------------- */

  /**
   * A lazily constructed PlaceableObject instance which can represent this Document on the game canvas.
   * @type {CardObject}
   */
  get object() {
    if (this._object || this._destroyed) return this._object;
    if (!this.parent?.isView || !this.layer) return null;
    return this._object = this.layer.createObject(this);
  }

  /**
   * Attached object
   * @type {CardObject}
   */
  // Using this._object so that way it sticks after constructor.
  _object = this._object ?? null;

  /* -------------------------------------------------- */

  static LOCALIZATION_PREFIXES = ["CCM", "CardObjectModel"];

  /* -------------------------------------------------- */

  static defineSchema() {
    const {NumberField, AngleField, IntegerSortField, BooleanField} = foundry.data.fields;
    return {
      x: new NumberField({
        required: true,
        integer: true,
        nullable: false
      }),
      y: new NumberField({
        required: true,
        integer: true,
        nullable: false
      }),
      elevation: new NumberField({
        required: true,
        nullable: false,
        initial: 0
      }),
      sort: new IntegerSortField(),
      rotation: new AngleField(),
      hidden: new BooleanField(),
      locked: new BooleanField(),
      /** Only used with Cards documents */
      flipped: new BooleanField(),
      width: new NumberField({
        required: true,
        min: CONST.GRID_MIN_SIZE,
        nullable: false,
        integer: true
      }),
      height: new NumberField({
        required: true,
        min: CONST.GRID_MIN_SIZE,
        nullable: false,
        integer: true
      }),
      texture: new foundry.data.TextureData(
        {},
        {
          initial: {
            anchorX: 0.5,
            anchorY: 0.5,
            fit: "contain",
            alphaThreshold: 0.75
          },
          wildcard: true
        }
      )
    };
  }

  /* -------------------------------------------------- */

  /**
   * Properties fetched from the appropriate flag
   * @type {string[]}
   */
  static flagProps = ["x", "y", "elevation", "sort", "rotation", "hidden", "locked", "flipped"];

  /* -------------------------------------------------- */

  static registerSettings() {
    game.settings.register(MODULE_ID, "showOwner", {
      name: "CCM.Settings.ShowNames.Label",
      hint: "CCM.Settings.ShowNames.Hint",
      scope: "client",
      config: true,
      type: new foundry.data.fields.BooleanField(),
      initial: true,
      onChange: value => canvas.cards.draw()
    });

    game.settings.register(MODULE_ID, "ownerFontSize", {
      name: "CCM.Settings.OwnerFontSize.Label",
      hint: "CCM.Settings.OwnerFontSize.Hint",
      scope: "client",
      config: true,
      type: new foundry.data.fields.NumberField({
        nullable: false,
        integer: true,
        min: 8,
        max: 512,
        initial: 160,
        validationError: "must be an integer between 8 and 512"
      }),
      onChange: value => canvas.cards.draw()
    });

    game.settings.register(MODULE_ID, "ownerTextColor", {
      name: "CCM.Settings.OwnerTextColor.Label",
      hint: "CCM.Settings.OwnerTextColor.Hint",
      scope: "client",
      config: true,
      type: new foundry.data.fields.ColorField({nullable: false, initial: "#ffffff"}),
      onChange: value => canvas.cards.draw()
    });

    game.settings.register(MODULE_ID, "ownerTextAlpha", {
      name: "CCM.Settings.OwnerTextAlpha.Label",
      hint: "CCM.Settings.OwnerTextAlpha.Hint",
      scope: "client",
      config: true,
      type: new foundry.data.fields.AlphaField(),
      onChange: value => canvas.cards.draw()
    });
  }

  /* -------------------------------------------------- */

  /**
   * The linked card's ID
   * @type {string}
   */
  get id() {
    return this.card.id;
  }

  /* -------------------------------------------------- */

  /**
   * The linked card's UUID
   * @type {string}
   */
  get uuid() {
    return this.card.uuid;
  }

  /* -------------------------------------------------- */

  /**
   * The linked card's document name
   * @type {"Card" | "Cards"}
   */
  get documentName() {
    return this.card.documentName;
  }

  /* -------------------------------------------------- */

  /**
   * The canvas card layer
   * @type {CardLayer}
   */
  get layer() {
    return canvas.cards;
  }

  /* -------------------------------------------------- */

  /**
   * The linked document sheet for the Card
   * @type {DocumentSheetV2}
   */
  get sheet() {
    // TODO: Consider a custom sheet for these at some point
    return this.card.sheet;
  }

  /* -------------------------------------------------- */

  /**
   * The font size used to display text within this card
   */
  get fontSize() {
    return game.settings.get(MODULE_ID, "ownerFontSize");
  }

  /* -------------------------------------------------- */

  /**
   * The font family used to display text within this card
   * @returns {string} Defaults to `CONFIG.defaultFontFamily`
   */
  get fontFamily() {
    return CONFIG.defaultFontFamily || "Signika";
  }

  /* -------------------------------------------------- */

  /**
   * The color of the text displayed within this card
   * @returns {Color}
   */
  get textColor() {
    return game.settings.get(MODULE_ID, "ownerTextColor");
  }

  /* -------------------------------------------------- */

  /**
   * The name of the user who owns this card
   * @returns {string}
   */
  get text() {
    const showOwner = game.settings.get(MODULE_ID, "showOwner");
    if (!showOwner) return "";
    /** @type {Cards} */
    const stack = this.card.documentName === "Card" ? this.card.parent : this.card;
    const ownerId = stack.getFlag(MODULE_ID, "primaryOwner");
    let owner = game.users.get(ownerId);
    if (!owner && (stack.type === "hand")) owner = game.users.find(u => (u.getFlag(MODULE_ID, "playerHand") === stack.id));
    return owner?.name ?? "";
  }

  /* -------------------------------------------------- */

  /**
   * The opacity of text displayed on this card
   * @returns {number}
   */
  get textAlpha() {
    return 1;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  clone(data = {}, context = {}) {
    // TODO: Possible refactor actually using the data and context object?
    return new this.constructor(this.card);
  }

  /* -------------------------------------------------- */

  /**
   * Translate update operations on the original card to this synthetic document
   * @param {object} changed  Differential data that was used to update the document
   * @param {Partial<DatabaseUpdateOperation>} options Additional options which modified the update request
   */
  update(changed, options, userId) {
    const flatChanges = foundry.utils.flattenObject(changed);
    if (flatChanges[`flags.${MODULE_ID}.-=${canvas.scene.id}`] === null) {
      return this.delete(options, userId);
    }
    const updates = {};
    const baseProps = ["height", "width"];
    for (const p of baseProps) {
      if (p in flatChanges) {
        let newValue = flatChanges[p];
        if (p === "height") newValue *= canvas.grid.sizeY;
        else if (p === "width") newValue *= canvas.grid.sizeX;
        updates[p] = newValue;
      }
    }
    for (const p of this.constructor.flagProps) {
      const translatedProp = `flags.${MODULE_ID}.${canvas.scene.id}.${p}`;
      if (translatedProp in flatChanges) {
        updates[p] = flatChanges[translatedProp];
        if ((p === "flipped") && (this.documentName === "Cards")) {
          try {
            const [bottomCard] = this.card._drawCards(1, CONST.CARD_DRAW_MODES.BOTTOM);
            updates["texture"] = {src: updates[p] ? bottomCard.img : this.card.img};
          }
          catch {
            console.error("Failed to flip deck", this.card.name);
            updates["texture"] = {src: this.card.img};
          }
        }
      }
    }
    // Face handling
    if (("face" in flatChanges) || (`faces.${this.card.face}.img` in flatChanges) || ("img" in flatChanges)) {
      if (
        (this.documentName === "Card")
        || (!this.flipped && !(("flipped" in updates) && updates["flipped"]))
      ) {
        updates["texture"] = {src: this.card.img};
      }
    }
    // Primary Owner Card Text
    if (foundry.utils.getProperty(changed, `flags.${MODULE_ID}.primaryOwner`) !== undefined) {
      options.cardText = true;
      if (this.card instanceof Cards) {
        for (const card of this.card.cards) {
          card.canvasCard?.object?.renderFlags.set({refreshText: true});
        }
      }
    }
    if ((this.card instanceof Card) && (("x" in updates) || ("y" in updates))) this._checkRegionTrigger(updates, userId);
    this.updateSource(updates);
    this.object?._onUpdate(updates, options, userId);
  }

  /* -------------------------------------------------- */

  /**
   * Refreshes the canvas card's face
   */
  refreshFace() {
    if (this.card instanceof Card) return; // Not needed at the moment
    let src;
    if (this.flipped) {
      try {
        const [bottomCard] = this.card._drawCards(1, CONST.CARD_DRAW_MODES.BOTTOM);
        src = bottomCard.img;
      }
      catch {
        console.error("Failed to flip deck", this.card.name);
      }
    }
    else src = this.card.img;

    const updates = {texture: {src}};
    this.updateSource(updates);
    this.object?._onUpdate(updates, {}, "");
  }

  /* -------------------------------------------------- */

  /**
   * Trigger leave and enter region behaviors for the custom region type & event triggers
   * Uses the incoming update data to compare to current document properties
   * @param {{x?: number, y?: number}} updates
   * @param {string} userId                     The ID of the user performing the check
   * @param {boolean} [newCard=false]           If this is a freshly dropped card
   */
  _checkRegionTrigger(updates, userId, newCard = false) {
    if (game.user.id !== userId) return;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const origin = {x: this.x + centerX, y: this.y + centerY, elevation: this.elevation};
    const destination = {
      x: (updates.x ?? this.x) + centerX,
      y: (updates.y ?? this.y) + centerY,
      elevation: updates.elevation ?? this.elevation
    };
    const eventData = {
      card: this.card,
      origin,
      destination
    };
    let makingMove = false;
    for (const region of this.parent.regions) {
      if (!region.object) continue;
      const triggeredBehaviors = region.behaviors.filter(b =>
        !b.disabled && (
          b.hasEvent(CONFIG.CCM.REGION_EVENTS.CARD_MOVE_OUT)
          || b.hasEvent(CONFIG.CCM.REGION_EVENTS.CARD_MOVE_IN)
        )
      );
      if (!triggeredBehaviors.length) continue;
      const originInside = region.testPoint(origin);
      const destinationInside = region.testPoint(destination);
      if (originInside && !destinationInside) {
        region._triggerEvent(CONFIG.CCM.REGION_EVENTS.CARD_MOVE_OUT, eventData);
      } else if ((!originInside || newCard) && destinationInside) {
        region._triggerEvent(CONFIG.CCM.REGION_EVENTS.CARD_MOVE_IN, eventData);
        // Crude way to approximate if this is going to trigger a pass event.
        makingMove ||= region.behaviors.some(b => b.type === "complete-card-management.moveCard");
      }
    }
    // Don't check deck drops if there's a region setup, and only original user does this part
    if (makingMove || (userId !== game.userId)) return;
    const decks = canvas.cards.documentCollection.filter(c => c.documentName === "Cards");
    for (const d of decks) {
      if (!d.canvasCard) continue;
      const {x, y, width, height} = d.canvasCard;
      if (destination.x.between(x, x + width, false) && destination.y.between(y, y + height, false)) {
        if (this.card.parent === d) {
          ui.notifications.warn(game.i18n.format("CCM.Warning.AlreadyInside", {card: this.card.name, stack: d.name}));
          continue;
        }
        ui.notifications.info(game.i18n.format("CCM.MoveCardBehavior.AddCard",
          {name: this.card.name, stack: d.name})
        );
        return this.card.pass(d);
      }
    }

    // Canvas Pile Handling
    const canvasPileId = canvas.scene.getFlag(MODULE_ID, "canvasPile");
    const canvasPile = game.cards.get(canvasPileId);
    const parent = this.card.parent;
    if (!canvasPile || (parent === canvasPile)) return;
    return this.card.pass(canvasPile);
  }

  /* -------------------------------------------------- */

  /**
   * Handles the deletion process for this synthetic document
   * @param {*} options
   * @param {*} userId
   */
  delete(options, userId) {
    // fix for #136, ensures that draw is complete before attempting to delete
    this._object?._partialDraw(() => this._object._onDelete(options, userId));
    this.card.canvasCard = undefined;
  }

  /* -------------------------------------------------- */

  /**
   * Synthetic passthrough
   * @returns {boolean}
   */
  get isOwner() {
    return this.card.isOwner;
  }

  /* -------------------------------------------------- */

  /**
   * Synthetic pass through
   * @param  {...any} args Arguments to Document#canUserModify
   * @returns {boolean}
   */
  canUserModify(...args) {
    return this.card.canUserModify(...args);
  }

  /* -------------------------------------------------- */

  /**
   * Synthetic pass through
   * @param  {...any} args Arguments to Document#testUserPermission
   * @returns {boolean}
   */
  testUserPermission(...args) {
    return this.card.testUserPermission(...args);
  }
}
