import {MODULE_ID} from "../helpers.mjs";

/**
 * A CardObject is an implementation of PlaceableObject which represents a single Card document within the Scene.
 * CardObjects are drawn inside of the {@link CardLayer} container
 */
export default class CardObject extends PlaceableObject {
  static embeddedName = "Card";

  /**
   * The texture that is used to fill this Drawing, if any.
   * @type {PIXI.Texture}
   */
  texture;

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

  // TODO: The render flag work is definitely more complex than I'm imagining
  static RENDER_FLAGS = {
    redraw: {propagate: ["refresh"]},
    refresh: {
      propagate: [
        "refreshState",
        "refreshTransform",
        "refreshMesh",
        "refreshElevation"
      ],
      alias: true
    },
    refreshState: {},
    refreshTransform: {
      propagate: ["refreshPosition", "refreshRotation", "refreshSize"],
      alias: true
    },
    refreshPosition: {},
    refreshRotation: {propagate: ["refreshFrame"]},
    refreshSize: {
      propagate: ["refreshPosition", "refreshFrame", "refreshMesh"]
    },
    refreshMesh: {},
    refreshFrame: {},
    refreshElevation: {}
  };

  /** @override */
  get layer() {
    return "cards";
  }

  /** @override */
  get bounds() {
    const objData = this.document.getFlag(MODULE_ID, canvas.scene.id);
    const {x, y, width, height, rotation} = objData;

    // If the card is rotated, return recomputed bounds according to rotation
    if (rotation !== 0)
      return PIXI.Rectangle.fromRotation(
        x,
        y,
        width,
        height,
        Math.toRadians(rotation)
      ).normalize();

    // Normal case
    return new PIXI.Rectangle(x, y, width, height).normalize();
  }

  /** @override */
  get id() {
    return this.document.uuid;
  }

  /** @override */
  get objectId() {
    let id = `${this.document.uuid}`;
    if (this.isPreview) id += ".preview";
    return id;
  }

  /** @override */
  async _draw(options) {
    // Load Tile texture
    let texture;
    if (this._original) texture = this._original.texture?.clone();
    else if (this.document.currentFace) {
      texture = await loadTexture(this.document.currentFace.img, {
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
    console.log("Card Object RenderFlags", flags);
    // if (flags.refreshState) this._refreshState();
    // if (flags.refreshPosition) this._refreshPosition();
    // if (flags.refreshRotation) this._refreshRotation();
    // if (flags.refreshShape) this._refreshShape();
    // if (flags.refreshText) this._refreshText();
    // if (flags.refreshFrame) this._refreshFrame();
    // if (flags.refreshElevation) this._refreshElevation();
  }

  /**
   * Refresh the position.
   * @protected
   */
  _refreshPosition() {
    const {x, y, width, height} = this.document.getFlag(MODULE_ID, canvas.scene.id);
    if ((this.position.x !== x) || (this.position.y !== y))
      MouseInteractionManager.emulateMoveEvent();
    this.position.set(x, y);
    this.shape.position.set(x + width / 2, y + height / 2);
    this.shape.pivot.set(width / 2, height / 2);
  }

  /* -------------------------------------------- */

  /**
   * Refresh the rotation.
   * @protected
   */
  _refreshRotation() {
    const rotation = Math.toRadians(this.document.rotation);
    this.shape.rotation = rotation;
    if (!this.text) return;
    this.text.rotation = rotation;
  }

  /* -------------------------------------------- */

  /**
   * Refresh the displayed state of the Drawing.
   * Used to update aspects of the Drawing which change based on the user interaction state.
   * @protected
   */
  _refreshState() {
    const {hidden, locked, sort} = this.document;
    const wasVisible = this.visible;
    this.visible = this.isVisible;
    if (this.visible !== wasVisible) MouseInteractionManager.emulateMoveEvent();
    this.alpha = this._getTargetAlpha();
    const colors = CONFIG.Canvas.dispositionColors;
    this.frame.border.tint = this.controlled
      ? locked
        ? colors.HOSTILE
        : colors.CONTROLLED
      : colors.INACTIVE;
    this.frame.border.visible =
      this.controlled || this.hover || this.layer.highlightObjects;
    this.frame.handle.visible = this.controlled && !locked;
    this.zIndex = this.shape.zIndex = this.controlled ? 2 : this.hover ? 1 : 0;
    this.shape.visible = this.visible;
    this.shape.sort = sort;
    this.shape.sortLayer = PrimaryCanvasGroup.SORT_LAYERS.DRAWINGS;
    this.shape.alpha = this.alpha * (hidden ? 0.5 : 1);
    this.shape.hidden = hidden;
    if (!this.text) return;
    this.text.alpha = this.document.textAlpha;
  }

  /* -------------------------------------------- */

  /**
   * Clear and then draw the shape.
   * @protected
   */
  _refreshShape() {
    this.shape.clear();
    this.shape.lineStyle(this._getLineStyle());
    this.shape.beginTextureFill(this._getFillStyle());
    const lineWidth = this.shape.line.width;
    const shape = this.document.shape;
    switch (shape.type) {
      case Drawing.SHAPE_TYPES.RECTANGLE:
        this.shape.drawRect(
          lineWidth / 2,
          lineWidth / 2,
          Math.max(shape.width - lineWidth, 0),
          Math.max(shape.height - lineWidth, 0)
        );
        break;
      case Drawing.SHAPE_TYPES.ELLIPSE:
        this.shape.drawEllipse(
          shape.width / 2,
          shape.height / 2,
          Math.max(shape.width - lineWidth, 0) / 2,
          Math.max(shape.height - lineWidth, 0) / 2
        );
        break;
      case Drawing.SHAPE_TYPES.POLYGON: {
        const isClosed =
          this.document.fillType ||
          shape.points.slice(0, 2).equals(shape.points.slice(-2));
        if (isClosed)
          this.shape.drawSmoothedPolygon(
            shape.points,
            this.document.bezierFactor * 2
          );
        else
          this.shape.drawSmoothedPath(
            shape.points,
            this.document.bezierFactor * 2
          );
        break;
      }
    }
    this.shape.endFill();
    this.shape.line.reset();
  }

  /* -------------------------------------------- */

  /**
   * Update sorting of this Drawing relative to other PrimaryCanvasGroup siblings.
   * Called when the elevation or sort order for the Drawing changes.
   * @protected
   */
  _refreshElevation() {
    this.shape.elevation = this.document.elevation;
  }

  /* -------------------------------------------- */

  /**
   * Refresh the border frame that encloses the Drawing.
   * @protected
   */
  _refreshFrame() {
    // Update the frame bounds
    const {
      shape: {width, height},
      rotation
    } = this.document;
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
    border
      .lineStyle({
        width: thickness,
        color: 0x000000,
        join: PIXI.LINE_JOIN.ROUND,
        alignment: 0.75
      })
      .drawShape(bounds);
    border
      .lineStyle({
        width: thickness / 2,
        color: 0xffffff,
        join: PIXI.LINE_JOIN.ROUND,
        alignment: 1
      })
      .drawShape(bounds);

    // Draw the handle
    this.frame.handle.refresh(bounds);
  }
}
