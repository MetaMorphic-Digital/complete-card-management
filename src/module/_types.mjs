/**
 * @typedef {object} CardObjectModelData
 * @property {number} [x]           The x-coordinate position of the top-left corner of the card. (Flags)
 * @property {number} [y]           The y-coordinate position of the top-left corner of the card. (Flags)
 * @property {number} [elevation]   The elevation of the card. (Flags)
 * @property {number} [sort]        The z-index ordering of this card relative to its siblings. (CardData)
 * @property {number} [rotation]    The angle of rotation for the card between 0 and 360. (Flags)
 * @property {boolean} [hidden]     Is the card currently hidden? (Flags)
 * @property {boolean} [locked]     Is the card currently locked? (Flags)
 * @property {number} [width]       The pixel width of the card. Derived from the Card's width.
 * @property {number} [height]      The pixel height of the card. Derived from the Card's height.
 * @property {number} [texture]     The card's texture on the canvas. Derived from the Card's facing.
 */

/**                       */

/**
 * @typedef {object} CanvasDropData
 * @property {string} type - The type of canvas drop
 * @property {string} [uuid] - The UUID of a document added
 * @property {number} x - The X coordinate
 * @property {number} y - The Y coordinate
 */
