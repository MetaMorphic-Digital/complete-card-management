
declare module "./canvas/CanvasCard.mjs" {
  /** A SchemaField subclass used to represent texture data. */
  type TextureData = {
    /** The URL of the texture source. */
    src: string|null;

    /** The X coordinate of the texture anchor. */
    anchorX: number;

    /** The Y coordinate of the texture anchor. */
    anchorY: number;

    /** The scale of the texture in the X dimension. */
    scaleX: number;

    /** The scale of the texture in the Y dimension. */
    scaleY: number;

    /** The X offset of the texture with (0,0) in the top left. */
    offsetX: number;

    /** The Y offset of the texture with (0,0) in the top left. */
    offsetY: number;

    /** An angle of rotation by which this texture is rotated around its center. */
    rotation: number;

    /** The tint applied to the texture. */
    tint: string;

    /**
     * Only pixels with an alpha value at or above this value are consider solid
     * w.r.t. to occlusion testing and light/weather blocking.
     */
    alphaThreshold: number;
  }

  export default interface CanvasCard {
    /** The x-coordinate position of the top-left corner of the card. (Flags) */
    x?: number;

    /** The y-coordinate position of the top-left corner of the card. (Flags) */
    y?: number;

    /** The elevation of the card. (Flags) */
    elevation?: number;

    /** The z-index ordering of this card relative to its siblings. (CardData) */
    sort?: number;

    /** The angle of rotation for the card between 0 and 360. (Flags) */
    rotation?: number;

    /** Is the card currently hidden? (Flags) */
    hidden?: boolean;

    /** Is the card currently locked? (Flags) */
    locked?: boolean;

    /** Is the card flipped to show the bottom? (Only used with Cards) */
    flipped: boolean;

    /** The pixel width of the card. Derived from the Card's width. */
    width?: number;

    /** The pixel height of the card. Derived from the Card's height. */
    height?: number;

    /** The card's texture on the canvas. Derived from the Card's facing. */
    texture?: TextureData;
  }
}

export interface CanvasDropData {
  /** The type of canvas drop */
  type: string;

  /** The UUID of a document added */
  uuid?: string;

  /** The X coordinate */
  x: number;

  /** The Y coordinate */
  y: number;
}