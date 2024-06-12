import {MODULE_ID} from "../helpers.mjs";

/**
 * A data model that captures the necessary characteristics for a CardObject on the canvas
 * Contains many properties to enable functionality as a synthetic document
 */
export default class CanvasCard extends foundry.abstract.DataModel {
  constructor(card) {
    if (!(card instanceof Card)) {
      throw new Error("The card object model takes a Card document as its only argument");
    }

    // TODO: Might need the scene ID to be taken in as an argument? Unclear
    const data = card.getFlag(MODULE_ID, canvas.scene.id);

    if (!data) {
      throw new Error("The card doesn't have location data for the current scene");
    }

    Object.assign(data, {
      texture: {
        src: card.img
      },
      width: card.width * canvas.grid.sizeX,
      height: card.height * canvas.grid.sizeY
    });

    super(data, {parent: canvas.scene});

    /**
     * A reference to the card document this takes data from.
     * @type {Card}
     */
    this.card = card;
  }

  /**
   * Synthetic parent
   * @type {Scene}
   */
  // Using this.parent so that way it sticks after constructor.
  parent = this.parent ?? null;

  /**
   * A lazily constructed PlaceableObject instance which can represent this Document on the game canvas.
   * @type {import('./CardObject.mjs').default}
   */
  get object() {
    if (this._object || this._destroyed) return this._object;
    if (!this.parent?.isView || !this.layer) return null;
    return this._object = this.layer.createObject(this);
  }

  /**
   * Attached object
   * @type {import('./CardObject.mjs').default}
   */
  // Using this._object so that way it sticks after constructor.
  _object = this._object ?? null;

  static LOCALIZATION_PREFIXES = ["CCM", "CardObjectModel"];

  static defineSchema() {
    const {NumberField, AngleField, IntegerSortField, BooleanField} = foundry.data.fields;
    return {
      x: new NumberField({
        required: true,
        integer: true,
        nullable: false,
        initial: 0
      }),
      y: new NumberField({
        required: true,
        integer: true,
        nullable: false,
        initial: 0
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
      width: new NumberField({
        required: true,
        min: 0,
        nullable: false,
        step: 0.1
      }),
      height: new NumberField({
        required: true,
        min: 0,
        nullable: false,
        step: 0.1
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

  static flagProps = ["x", "y", "elevation", "rotation", "hidden", "locked"];

  static derivedProps = ["height", "width", "texture"];

  /** @override */
  get id() {
    return this.card.id;
  }

  /** @override */
  get documentName() {
    return this.card.documentName;
  }

  /** @override */
  get layer() {
    return canvas.cards;
  }

  /** @override */
  get sheet() {
    // TODO: Custom sheet? I think?
    return this.card.sheet;
  }

  /** @override */
  clone(data = {}, context = {}) {
    // TODO: Possible refactor actually using the data and context object?
    return new this.constructor(this.card);
  }

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
    const flagProps = ["x", "y", "elevation", "sort", "rotation", "hidden", "locked"];
    for (const p of baseProps) {
      if (p in flatChanges) {
        let newValue = flatChanges[p];
        if (p === "height") newValue *= canvas.grid.sizeY;
        else if (p === "width") newValue *= canvas.grid.sizeX;
        updates[p] = newValue;
      }
    }
    for (const p of flagProps) {
      const translatedProp = `flags.${MODULE_ID}.${canvas.scene.id}.${p}`;
      if (translatedProp in flatChanges) {
        updates[p] = flatChanges[translatedProp];
      }
    }
    // Face handling
    if (("face" in flatChanges) || (`faces.${this.card.face}.img` in flatChanges)) {
      updates["texture"] = {src: this.card.img};
    }
    if (updates.x || updates.y) this._checkRegionTrigger(updates, userId);
    this.updateSource(updates);
    this.object?._onUpdate(updates, options, userId);
  }

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
    const origin = {x: this.x + centerX, y: this.y + centerY};
    const destination = {x: (updates.x ?? this.x) + centerX, y: (updates.y ?? this.y) + centerY};
    const eventData = {
      card: this.card,
      origin,
      destination
    };
    for (const region of this.parent.regions) {
      if (!region.object) continue;
      const triggeredBehaviors = region.behaviors.filter(b => 
        !b.disabled && (
          b.hasEvent(CONFIG.CCM.REGION_EVENTS.CARD_MOVE_OUT)
          || b.hasEvent(CONFIG.CCM.REGION_EVENTS.CARD_MOVE_IN)
        )
      );
      if (!triggeredBehaviors.length) continue;
      const originInside = region.object.testPoint(origin);
      const destinationInside = region.object.testPoint(destination);
      if (originInside && !destinationInside) {
        region._triggerEvent(CONFIG.CCM.REGION_EVENTS.CARD_MOVE_OUT, eventData);
      } else if ((!originInside || newCard) && destinationInside) {
        region._triggerEvent(CONFIG.CCM.REGION_EVENTS.CARD_MOVE_IN, eventData);
      }
    }
  }

  /**
   * Handles the deletion process for this synthetic document
   * @param {*} options
   * @param {*} userId
   */
  delete(options, userId) {
    this._object?._onDelete(options, userId);
    this.card.canvasCard = undefined;
  }

  /**
   * Synthetic passthrough
   * @returns {boolean}
   */
  get isOwner() {
    return this.card.isOwner;
  }

  /**
   * Synthetic pass through
   * @param  {...any} args Arguments to Document#canUserModify
   * @returns {boolean}
   */
  canUserModify(...args) {
    return this.card.canUserModify(...args);
  }

  /**
   * Synthetic pass through
   * @param  {...any} args Arguments to Document#testUserPermission
   * @returns {boolean}
   */
  testUserPermission(...args) {
    return this.card.testUserPermission(...args);
  }
}
