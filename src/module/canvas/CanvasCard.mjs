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
   * Attached object
   * @type {import('./CardObject.mjs').CardObject}
   */
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
    const updates = {};
    const baseProps = ["height", "width"];
    const flagProps = ["x", "y", "elevation", "sort", "rotation", "hidden", "locked"];
    for (const p of baseProps) {
      if (p in flatChanges) updates[p] = flatChanges[p];
    }
    for (const p of flagProps) {
      const translatedProp = `flags.${MODULE_ID}.${canvas.scene.id}.${p}`;
      if (translatedProp in flatChanges) updates[p] = flatChanges[translatedProp];
    }
    // Face handling
    if (("face" in flatChanges) || (`faces.${this.card.face}.img` in flatChanges)) {
      updates["texture"] = {src: this.card.img};
    }
    this.updateSource(updates);
    this._object._onUpdate(updates, options, userId);
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
