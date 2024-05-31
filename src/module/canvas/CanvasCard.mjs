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
      sort: card.sort, // possible we want a separate sort value for canvas purposes
      texture: {
        src: card.currentFace.img
      },
      width: card.width * canvas.grid.sizeX,
      height: card.height * canvas.grid.sizeY
    });

    super(data, {parent: canvas.scene});

    /**
     * A reference to the card document this takes data from
     */
    this.card = card;
  }

  static LOCALIZATION_PREFIXES = ["CCM", "CardObjectModel"];

  static defineSchema() {
    const {NumberField, AngleField, BooleanField} = foundry.data.fields;
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
      sort: new NumberField({
        required: true,
        integer: true,
        nullable: false,
        initial: 0
      }),
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

  get id() {
    return this.card.id;
  }

  get documentName() {
    return this.card.documentName;
  }

  get layer() {
    return canvas.cards;
  }

  get sheet() {
    // TODO: Custom sheet? I think?
    return this.card.sheet;
  }

  // clone

  // update

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
