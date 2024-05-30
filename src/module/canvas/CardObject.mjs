import CanvasCard from "./CanvasCard.mjs";

/**
 * A CardObject is an implementation of PlaceableObject which represents a single Card document within the Scene.
 * CardObjects are drawn inside of the {@link CardLayer} container
 */
export default class CardObject extends PlaceableObject {

  constructor(canvasCard) {
    if (!(canvasCard instanceof CanvasCard)) {
      throw new Error("You must provide a CanvasCard to construct a CardObject")
    }
    // PlaceableObject checks for both document status and embedded
    super(canvasCard.card)

    /** @override */
    this.scene = canvasCard.parent;

    /** @override */
    this.document = canvasCard;
  }

  static embeddedName = "Card";

  /**
   * The texture that is used to fill this Drawing, if any.
   * @type {PIXI.Texture}
   */
  texture;

  /**
   * A reference to the SpriteMesh which displays this CardObject in the InterfaceCanvasGroup.
   * @type {SpriteMesh}
   */
  mesh;

  /**
   * The border frame and resizing handles for the drawing.
   * @type {PIXI.Container}
   */
  frame;

  /**
   * A Card background which is displayed if no valid image texture is present
   * @type {PIXI.Graphics}
   */
  bg;

  static RENDER_FLAGS = {
    redraw: {propagate: ["refresh"]},
    refresh: {propagate: ["refreshState", "refreshTransform", "refreshMesh", "refreshElevation"], alias: true},
    refreshState: {},
    refreshTransform: {propagate: ["refreshPosition", "refreshRotation", "refreshSize"], alias: true},
    refreshPosition: {},
    refreshRotation: {propagate: ["refreshFrame"]},
    refreshSize: {propagate: ["refreshFrame"]},
    refreshMesh: {},
    refreshFrame: {},
    refreshElevation: {},
  };

  /** @override */
  get layer() {
    return "cards";
  }

  /** @override */
  get bounds() {
    let {x, y, width, height, texture, rotation} = this.document;

    // Adjust top left coordinate and dimensions according to scale
    if (texture.scaleX !== 1) {
      const w0 = width;
      width *= Math.abs(texture.scaleX);
      x += (w0 - width) / 2;
    }
    if (texture.scaleY !== 1) {
      const h0 = height;
      height *= Math.abs(texture.scaleY);
      y += (h0 - height) / 2;
    }

    // If the tile is rotated, return recomputed bounds according to rotation
    if (rotation !== 0) return PIXI.Rectangle.fromRotation(x, y, width, height, Math.toRadians(rotation)).normalize();

    // Normal case
    return new PIXI.Rectangle(x, y, width, height).normalize();
  }

  /**
   * Is this Tile currently visible on the Canvas?
   * @type {boolean}
   */
  get isVisible() {
    return !this.document.hidden || game.user.isGM;
  }

  /** @override */
  get id() {
    return this.document.card.uuid;
  }

  /** @override */
  get objectId() {
    let id = `${this.document.card.uuid}`;
    if (this.isPreview) id += ".preview";
    return id;
  }

  /** @override */
  async _draw(options) {
    // Load Card texture
    let texture;
    if (this._original) texture = this._original.texture?.clone();
    else if (this.document.texture.src) {
      texture = await loadTexture(this.document.texture.src, {
        fallback: "cards/backs/light-soft.webp"
      });
    }

    this.texture = texture;

    // Draw the Card mesh
    if (this.texture) {
      this.mesh = canvas.interface.addCard(this);
      this.bg = undefined;
    }

    // Draw a placeholder background
    else {
      canvas.interface.removeCard(this);
      this.texture = this.mesh = null;
      this.bg = this.addChild(new PIXI.Graphics());
      this.bg.eventMode = "none";
    }

    // Control Border
    this.frame = this.addChild(this.#drawFrame());

    // Interactivity
    this.cursor = this.document.isOwner ? "pointer" : null;
  }

  /**
   * Create elements for the Drawing border and handles
   * @returns {PIXI.Container}
   */
  #drawFrame() {
    const frame = new PIXI.Container();
    frame.eventMode = "passive";
    frame.bounds = new PIXI.Rectangle();
    frame.interaction = frame.addChild(new PIXI.Container());
    frame.interaction.hitArea = frame.bounds;
    frame.interaction.eventMode = "auto";
    frame.border = frame.addChild(new PIXI.Graphics());
    frame.border.eventMode = "none";
    frame.handle = frame.addChild(new ResizeHandle([1, 1]));
    frame.handle.eventMode = "static";
    return frame;
  }

  /** @override */
  _destroy(options) {
    this.texture?.destroy();
  }

  /**
   * Apply render flags before a render occurs.
   * @param {Object<boolean>} flags  The render flags which must be applied
   * @protected
   */
  _applyRenderFlags(flags) {
    if (flags.refreshState) this._refreshState();
    if (flags.refreshPosition) this._refreshPosition();
    if (flags.refreshRotation) this._refreshRotation();
    if (flags.refreshSize) this._refreshSize();
    if (flags.refreshMesh) this._refreshMesh();
    if (flags.refreshFrame) this._refreshFrame();
    if (flags.refreshElevation) this._refreshElevation();
  }

  /**
   * Refresh the position.
   * @protected
   */
  _refreshPosition() {
    const {x, y, width, height} = this.document;
    if ((this.position.x !== x) || (this.position.y !== y)) MouseInteractionManager.emulateMoveEvent();
    this.position.set(x, y);
    if (!this.mesh) {
      this.bg.position.set(width / 2, height / 2);
      this.bg.pivot.set(width / 2, height / 2);
      return;
    }
    this.mesh.position.set(x + (width / 2), y + (height / 2));
  }

  /* -------------------------------------------- */

  /**
   * Refresh the rotation.
   * @protected
   */
  _refreshRotation() {
    const rotation = this.document.rotation;
    if (!this.mesh) return this.bg.angle = rotation;
    this.mesh.angle = rotation;
  }

  /**
   * Refresh the size.
   * @protected
   */
  _refreshSize() {
    const {width, height, texture: {fit, scaleX, scaleY}} = this.document;
    if (!this.mesh) return this.bg.clear().beginFill(0xFFFFFF, 0.5).drawRect(0, 0, width, height).endFill();
    this._resizeMesh(width, height, {fit, scaleX, scaleY});
  }

  /**
   * Refresh the displayed state of the CardObject.
   * Used to update aspects of the CardObject which change based on the user interaction state.
   * @protected
   */
  _refreshState() {
    const {hidden, locked, elevation, sort} = this.document;
    this.visible = this.isVisible;
    this.alpha = this._getTargetAlpha();
    if (this.bg) this.bg.visible = this.layer.active;
    const colors = CONFIG.Canvas.dispositionColors;
    this.frame.border.tint = this.controlled ? (locked ? colors.HOSTILE : colors.CONTROLLED) : colors.INACTIVE;
    this.frame.border.visible = this.controlled || this.hover || this.layer.highlightObjects;
    this.frame.handle.visible = this.controlled && !locked;
    const foreground = this.layer.active && !!ui.controls.control.foreground;
    const overhead = elevation >= this.document.parent.foregroundElevation;
    const oldEventMode = this.eventMode;
    this.eventMode = overhead === foreground ? "static" : "none";
    if (this.eventMode !== oldEventMode) MouseInteractionManager.emulateMoveEvent();
    const zIndex = this.zIndex = this.controlled ? 2 : this.hover ? 1 : 0;
    if (!this.mesh) return;
    this.mesh.visible = this.visible;
    this.mesh.sort = sort;
    this.mesh.zIndex = zIndex;
    this.mesh.alpha = this.alpha * (hidden ? 0.5 : 1);
    this.mesh.hidden = hidden;
  }

  /* -------------------------------------------- */

  /**
   * Refresh the appearance of the CardObject.
   * @protected
   */
  _refreshMesh() {
    if (!this.mesh) return;
    const {width, height, texture} = this.document;
    const {anchorX, anchorY, fit, scaleX, scaleY, tint, alphaThreshold} = texture;
    this.mesh.anchor.set(anchorX, anchorY);
    this._resizeMesh(width, height, {fit, scaleX, scaleY});

    this.mesh.tint = tint;
    this.mesh.textureAlphaThreshold = alphaThreshold;
  }

  /**
   * Refresh the elevation
   * @protected
   */
  _refreshElevation() {
    if (!this.mesh) return;
    this.mesh.elevation = this.document.elevation;
  }

  /* -------------------------------------------- */

  /**
   * Refresh the border frame that encloses the CardObject.
   * @protected
   */
  _refreshFrame() {
    // Update the frame bounds
    const {width, height, rotation} = this.document;
    const bounds = this.frame.bounds;
    bounds.x = 0;
    bounds.y = 0;
    bounds.width = width;
    bounds.height = height;
    bounds.rotate(Math.toRadians(rotation));
    MouseInteractionManager.emulateMoveEvent();

    // Draw the border
    const thickness = CONFIG.Canvas.objectBorderThickness;
    const border = this.frame.border;
    border.clear();
    border.lineStyle({width: thickness, color: 0x000000, join: PIXI.LINE_JOIN.ROUND, alignment: 0.75})
      .drawShape(bounds);
    border.lineStyle({width: thickness / 2, color: 0xFFFFFF, join: PIXI.LINE_JOIN.ROUND, alignment: 1})
      .drawShape(bounds);

    // Draw the handle
    this.frame.handle.refresh(bounds);
  }

  _resizeMesh(baseWidth, baseHeight, {fit = "fill", scaleX = 1, scaleY = 1} = {}) {
    if (!((baseWidth >= 0) && (baseHeight >= 0))) {
      throw new Error(`Invalid baseWidth/baseHeight passed to ${this.constructor.name}#_resizeMesh.`);
    }
    const {width: textureWidth, height: textureHeight} = this.mesh._texture;
    let sx;
    let sy;
    switch (fit) {
      case "fill":
        sx = baseWidth / textureWidth;
        sy = baseHeight / textureHeight;
        break;
      case "cover":
        sx = sy = Math.max(baseWidth / textureWidth, baseHeight / textureHeight);
        break;
      case "contain":
        sx = sy = Math.min(baseWidth / textureWidth, baseHeight / textureHeight);
        break;
      case "width":
        sx = sy = baseWidth / textureWidth;
        break;
      case "height":
        sx = sy = baseHeight / textureHeight;
        break;
      default:
        throw new Error(`Invalid fill type passed to ${this.constructor.name}#_resizeMesh (fit=${fit}).`);
    }
    sx *= scaleX;
    sy *= scaleY;
    this.mesh.scale.set(sx, sy);
    this.mesh._width = Math.abs(sx * textureWidth);
    this.mesh._height = Math.abs(sy * textureHeight);
  }
}
