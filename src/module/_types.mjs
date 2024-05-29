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
 * @typedef {object} PlaceablesLayerOptions
 * @property {boolean} controllableObjects  Can placeable objects in this layer be controlled?
 * @property {boolean} rotatableObjects     Can placeable objects in this layer be rotated?
 * @property {boolean} confirmDeleteKey     Confirm placeable object deletion with a dialog?
 * @property {PlaceableObject} objectClass  The class used to represent an object on this layer.
 * @property {boolean} quadtree             Does this layer use a quadtree to track object positions?
 */

/**
 * @typedef {object} PlaceableObject
 * @property {boolean} isOwner A convenient reference for whether the current User has full control over the document.
 */

/**
 * @typedef {object} CardData
 * @property {string} _id                 The _id which uniquely identifies this Card document
 * @property {string} name                The text name of this card
 * @property {string} [description]       A text description of this card which applies to all faces
 * @property {string} type                A category of card (for example, a suit) to which this card belongs
 * @property {object} [system]            Game system data which is defined by the system template.json model
 * @property {string} [suit]              An optional suit designation which is used by default sorting
 * @property {number} [value]             An optional numeric value of the card which is used by default sorting
 * @property {CardFaceData} back          An object of face data which describes the back of this card
 * @property {CardFaceData[]} faces       An array of face data which represent displayable faces of this card
 * @property {number|null} face           The index of the currently displayed face, or null if the card is face-down
 * @property {boolean} drawn              Whether this card is currently drawn from its source deck
 * @property {string} origin              The document ID of the origin deck to which this card belongs
 * @property {number} width               The visible width of this card
 * @property {number} height              The visible height of this card
 * @property {number} rotation            The angle of rotation of this card
 * @property {number} sort                The sort order of this card relative to others in the same stack
 * @property {object} flags               An object of optional key/value flags
 */

/**
 * @typedef {object} CardFaceData
 * @property {string} [name]              A name for this card face
 * @property {string} [text]              Displayed text that belongs to this face
 * @property {string} [img]               A displayed image or video file which depicts the face
 */

/**
 * @typedef {object} CanvasDropData
 * @property {string} type - The type of canvas drop
 * @property {string} [uuid] - The UUID of a document added
 * @property {number} x - The X coordinate
 * @property {number} y - The Y coordinate
 */
