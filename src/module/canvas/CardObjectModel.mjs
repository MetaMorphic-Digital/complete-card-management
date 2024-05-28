/**
 * A data model that captures the necessary characteristics for a CardObject on the canvas
 */
export default class CardObjectModel extends foundry.abstract.DataModel {
  static LOCALIZATION_PREFIXES = ['CCM', 'CardObjectModel'];

  static defineSchema() {
    const { NumberField, AngleField, BooleanField } = foundry.data.fields;
    return {
      x: new NumberField({
        required: true,
        integer: true,
        nullable: false,
        initial: 0,
      }),
      y: new NumberField({
        required: true,
        integer: true,
        nullable: false,
        initial: 0,
      }),
      elevation: new NumberField({
        required: true,
        nullable: false,
        initial: 0,
      }),
      sort: new NumberField({
        required: true,
        integer: true,
        nullable: false,
        initial: 0,
      }),
      rotation: new AngleField(),
      hidden: new BooleanField(),
      locked: new BooleanField(),
      width: new NumberField({
        required: true,
        min: 0,
        nullable: false,
        step: 0.1,
      }),
      height: new NumberField({
        required: true,
        min: 0,
        nullable: false,
        step: 0.1,
      }),
      texture: new foundry.data.TextureData(
        {},
        {
          initial: {
            anchorX: 0.5,
            anchorY: 0.5,
            fit: 'contain',
            alphaThreshold: 0.75,
          },
          wildcard: true,
        }
      ),
    };
  }
}
