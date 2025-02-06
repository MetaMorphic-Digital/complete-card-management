import {MODULE_ID} from "../helpers.mjs";
import CanvasCard from "./CanvasCard.mjs";
import CardLayer from "./CardLayer.mjs";

/**
 * A CardObject is an implementation of PlaceableObject which represents a single Card document within the Scene.
 * CardObjects are drawn inside of the {@link CardLayer} container
 */
export default class CardObject extends foundry.canvas.placeables.PlaceableObject {
  constructor(canvasCard) {
    if (!(canvasCard instanceof CanvasCard)) {
      throw new Error("You must provide a CanvasCard to construct a CardObject");
    }

    // PlaceableObject constructor checks for both document status and embedded
    let document = canvasCard.card;
    if (canvasCard.card instanceof Cards) {
      const handler = {
        get(target, prop, receiver) {
          if (prop === "isEmbedded") return true;
          return Reflect.get(...arguments);
        }
      };
      document = new Proxy(document, handler);
    }
    super(document);

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
   * The border frame for the CardObject.
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
    refresh: {
      propagate: ["refreshState", "refreshTransform", "refreshMesh", "refreshText", "refreshElevation"],
      alias: true
    },
    refreshState: {},
    refreshTransform: {propagate: ["refreshRotation", "refreshSize"], alias: true},
    refreshRotation: {propagate: ["refreshFrame"]},
    refreshSize: {propagate: ["refreshPosition", "refreshFrame", "refreshText"]},
    refreshPosition: {},
    refreshMesh: {},
    refreshText: {},
    refreshFrame: {},
    refreshElevation: {}
  };

  /**
   * @override
   * @returns {CardLayer}
   */
  get layer() {
    return canvas["cards"];
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

    // If the card is rotated, return recomputed bounds according to rotation
    if (rotation !== 0) return PIXI.Rectangle.fromRotation(x, y, width, height, Math.toRadians(rotation)).normalize();

    // Normal case
    return new PIXI.Rectangle(x, y, width, height).normalize();
  }

  /**
   * Does the CanvasCard have text that is displayed?
   * @type {boolean}
   */
  get hasText() {
    return !!this.document.text && (this.document.fontSize > 0);
  }

  /**
   * Is this Card currently visible on the Canvas?
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
      texture = await foundry.canvas.loadTexture(this.document.texture.src, {
        fallback: "cards/backs/light-soft.webp"
      });
    }

    this.texture = texture;

    // Draw the Card mesh
    if (this.texture) {
      this.mesh = canvas.interface.addCard(this);
      this.mesh.canvasCard = this;
      this.bg = undefined;
      // Card text
      this.mesh.text = this.hasText ? this.mesh.addChild(this.#drawText()) : null;
    }

    // Draw a placeholder background
    else {
      canvas.interface.removeCard(this);
      this.texture = this.mesh = null;
      this.bg = this.addChild(new PIXI.Graphics());
    }

    // Control Border
    this.frame = this.addChild(this.#drawFrame());

    // Interactivity
    this.cursor = this.document.isOwner ? "pointer" : null;
  }

  /**
   * Create elements for the Card border and handles
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
    return frame;
  }

  /**
   * Create a PreciseText element to be displayed as part of this drawing.
   * @returns {PreciseText}
   */
  #drawText() {
    const text = new PreciseText(this.document.text || "", this._getTextStyle());
    text.eventMode = "none";
    text.anchor.set(0.5, 0.5);
    return text;
  }

  /** @override */
  _destroy(options) {
    canvas.interface.removeCard(this);
    this.texture?.destroy();
    this.frame?.destroy(); // Unsure if needed? Possibly resolves multi-select frame issue
  }

  /**
   * Prepare the text style used to instantiate a PIXI.Text or PreciseText instance for this Drawing document.
   * @returns {PIXI.TextStyle}
   * @protected
   */
  _getTextStyle() {
    const {fontSize, fontFamily, textColor, width} = this.document;
    const stroke = Math.max(Math.round(fontSize / 32), 2);
    return PreciseText.getTextStyle({
      fontFamily: fontFamily,
      fontSize: fontSize,
      fill: textColor,
      strokeThickness: stroke,
      dropShadowBlur: Math.max(Math.round(fontSize / 16), 2),
      align: "center",
      wordWrap: true,
      wordWrapWidth: width,
      padding: stroke * 4
    });
  }

  /**
   * Apply render flags before a render occurs.
   * @param {Record<string, boolean>} flags      The render flags which must be applied
   * @protected
   */
  _applyRenderFlags(flags) {
    if (flags.refreshState) this._refreshState();
    if (flags.refreshRotation) this._refreshRotation();
    if (flags.refreshSize) this._refreshSize();
    if (flags.refreshPosition) this._refreshPosition();
    if (flags.refreshMesh) this._refreshMesh();
    if (flags.refreshText) this._refreshText();
    if (flags.refreshFrame) this._refreshFrame();
    if (flags.refreshElevation) this._refreshElevation();

    if (this.hasActiveHUD) canvas.cards.hud.render();
  }

  /* -------------------------------------------- */

  /**
   * Refresh the displayed state of the CardObject.
   * Used to update aspects of the CardObject which change based on the user interaction state.
   * @protected
   */
  _refreshState() {
    const {hidden, locked, sort} = this.document;
    this.visible = this.isVisible;
    this.alpha = this._getTargetAlpha();
    if (this.bg) this.bg.visible = this.layer.active;
    const colors = CONFIG.Canvas.dispositionColors;
    this.frame.border.tint = this.controlled ? (locked ? colors.HOSTILE : colors.CONTROLLED) : colors.INACTIVE;
    this.frame.border.visible = this.controlled || this.hover || this.layer.highlightObjects;
    const zIndex = this.zIndex = this.controlled ? 2 : this.hover ? 1 : 0;
    if (!this.mesh) return;
    this.mesh.visible = this.visible;
    this.mesh.sort = sort;
    this.mesh.zIndex = zIndex;
    this.mesh.alpha = this.alpha * (hidden ? 0.5 : 1);
    this.mesh.hidden = hidden;
  }

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
   * Refresh the position.
   * @protected
   */
  _refreshPosition() {
    const {x, y, width, height} = this.document;
    if ((this.position.x !== x) || (this.position.y !== y)) foundry.canvas.interaction.MouseInteractionManager.emulateMoveEvent();
    this.position.set(x, y);
    if (!this.mesh) {
      this.bg.position.set(width / 2, height / 2);
      this.bg.pivot.set(width / 2, height / 2);
      return;
    }
    this.mesh.position.set(x + (width / 2), y + (height / 2));
  }

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

  /**
   * Refresh the content and appearance of text.
   * @protected
   */
  _refreshText() {
    const pixiText = this.mesh?.text;
    if (!pixiText) return;
    const {text, textAlpha} = this.document;
    pixiText.text = text ?? "";
    pixiText.alpha = textAlpha;
    pixiText.style = this._getTextStyle();
  }

  /**
   * Refresh the border frame that encloses the CardObject.
   * @protected
   */
  _refreshFrame() {
    // Update the frame bounds
    const {width, height, rotation} = this.document;
    const bounds = this.frame.bounds;
    const offsetX = (width - this.mesh.width) / 2;
    const offsetY = (height - this.mesh.height) / 2;
    bounds.x = 0 + offsetX;
    bounds.y = 0 + offsetY;
    bounds.width = width - 2 * offsetX;
    bounds.height = height - 2 * offsetY;
    bounds.rotate(Math.toRadians(rotation));
    foundry.canvas.interaction.MouseInteractionManager.emulateMoveEvent();

    // Draw the border
    const thickness = CONFIG.Canvas.objectBorderThickness;
    const border = this.frame.border;
    border.clear();
    border.lineStyle({width: thickness, color: 0x000000, join: PIXI.LINE_JOIN.ROUND, alignment: 0.75})
      .drawShape(bounds);
    border.lineStyle({width: thickness / 2, color: 0xFFFFFF, join: PIXI.LINE_JOIN.ROUND, alignment: 1})
      .drawShape(bounds);
  }

  /**
   * Adapted from `PrimarySpriteMesh#resize`, this helper method adjusts the contained SpriteMesh
   * according to desired dimensions and options.
   * @param {number} baseWidth  The base width used for computations.
   * @param {number} baseHeight The base height used for computations.
   * @param {*} [options]       options
   * @param {"fill"|"cover"|"contain"|"width"|"height"} [options.fit="fill"]  The fit type.
   * @param {number} [options.scaleX=1]    The scale on X axis.
   * @param {number} [options.scaleY=1]    The scale on Y axis.
   */
  _resizeMesh(baseWidth, baseHeight, {fit = "fill", scaleX = 1, scaleY = 1} = {}) {
    if (!(baseWidth >= 0) || !(baseHeight >= 0)) {
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

  /* -------------------------------------------- */

  /** @override */
  _onCreate(data, options, userId) {
    canvas.cards.objects.addChild(this);
    this.draw();
  }

  /** @override */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    const restrictionsChanged = ("restrictions" in changed) && !foundry.utils.isEmpty(changed.restrictions);

    if (("sort" in changed) || ("elevation" in changed)) {
      this.parent.sortDirty = true;
      if (this.mesh) this.mesh.parent.sortDirty = true;
    }

    // Refresh the Drawing
    this.renderFlags.set({
      redraw: ("texture" in changed) && ("src" in changed.texture),
      refreshState: ("sort" in changed) || ("hidden" in changed) || ("locked" in changed) || restrictionsChanged,
      refreshPosition: ("x" in changed) || ("y" in changed),
      refreshRotation: "rotation" in changed,
      refreshSize: ("width" in changed) || ("height" in changed),
      refreshMesh: ("texture" in changed),
      refreshText: (options.cardText),
      refreshElevation: "elevation" in changed,
      refreshPerception: ("occlusion" in changed) && ("mode" in changed.occlusion)
    });
  }

  /* -------------------------------------------- */
  /*  Interactivity                               */
  /* -------------------------------------------- */

  /** @override */
  _onClickLeft2(event) {
    const filePath = this.document.texture.src;
    if (filePath) {
      const ip = new ImagePopout(filePath, {
        title: this.document.card.name,
        uuid: this.document.card.uuid
      });
      ip.render(true);
    }
    if (!this._propagateLeftClick(event)) event.stopPropagation();
  }

  /** @override */
  _canDragLeftStart(user, event) {
    if (game.paused && !game.user.isGM) {
      ui.notifications.warn("GAME.PausedWarning", {localize: true});
      return false;
    }
    if (this.document.locked && (this.document.documentName === "Card")) {
      ui.notifications.warn(game.i18n.format("CONTROLS.ObjectIsLocked", {type: this.document.documentName}));
      return false;
    }
    return true;
  }

  /**
   * Card draw mode to use for this CardObject
   */
  get cardDrawMode() {
    if (this.document.flipped) return CONST.CARD_DRAW_MODES.LAST;
    return CONST.CARD_DRAW_MODES.FIRST;
  }

  /** @override */
  _onDragLeftStart(event) {

    /** @type {this[]} */
    const objects = this.layer.controlled;
    const clones = [];
    for (const o of objects) {
      if (!o._canDrag(game.user, event)) continue;
      else if (o.document.locked) {
        if ((this.document.documentName === "Card")) continue;
        else if ((objects.length > 1) || !canvas.scene.canUserModify(game.user, "update")) continue;
        try {
          const [card] = o.document.card._drawCards(1, this.cardDrawMode);
          if (card.canvasCard?.object) {
            ui.notifications.error("CCM.Warning.FailCanvasDeck", {localize: true});
            continue;
          }
        }
        catch {
          ui.notifications.error("CCM.Warning.FailDraw", {localize: true});
          continue;
        }
        ui.notifications.info(game.i18n.format("CCM.CardLayer.DragCardFromDeck", {name: o.document.card.name}));
      }
      // Clone the object
      const c = o.clone();
      clones.push(c);

      // Draw the clone
      c._onDragStart();
      c.visible = false;
      this.layer.preview.addChild(c);
      c.draw().then(c => c.visible = true);
    }
    event.interactionData.clones = clones;
  }

  /** @override */
  _onDragLeftDrop(event) {
    // Ensure that we landed in bounds
    const {clones, destination} = event.interactionData;
    if (!clones || !canvas.dimensions.rect.contains(destination.x, destination.y)) return false;
    event.interactionData.clearPreviewContainer = false;

    // Perform database updates using dropped data
    const updates = this._prepareDragLeftDropUpdates(event);
    if (updates) this.#commitDragLeftDropUpdates(updates);
  }

  /**
   * @typedef DragUpdate
   * @prop {number} x - The new x coordinate
   * @prop {number} y - The new y coordinate
   * @prop {number} rotation - The new rotation
   * @prop {string} _id - The canvas card's UUID
   */

  /**
   * Perform database updates using the result of a drag-left-drop operation.
   * @param {DragUpdate[]} updates      The database updates
   * @returns {Promise<void>}
   */
  async #commitDragLeftDropUpdates(updates) {
    const cardStackUpdates = [];

    const processedUpdates = updates.reduce((cards, u) => {
      const d = fromUuidSync(u._id);
      const updateData = {
        flags: {
          [MODULE_ID]: {
            [this.scene.id]: {
              x: u.x,
              y: u.y,
              rotation: u.rotation
            }
          }
        },
        _id: d.id
      };
      if (d instanceof Cards) {
        const trueLocked = this.document.card.getFlag(MODULE_ID, canvas.scene.id).locked;
        if (!trueLocked) cardStackUpdates.push(updateData);
        else {
          // Pulls the next card.
          const [card] = d._drawCards(1, this.cardDrawMode);
          if (!card) {
            ui.notifications.error("CCM.Warning.FailDraw", {localize: true});
            return cards;
          }
          updateData._id = card.id;
          cards[d.id] = [updateData];
          const currentCards = new Set(canvas.scene.getFlag(MODULE_ID, "cardCollection")).add(card.uuid);
          canvas.scene.setFlag(MODULE_ID, "cardCollection", Array.from(currentCards));
        }
      } else {
        const parentSlot = cards[d.parent.id];
        if (parentSlot) parentSlot.push(updateData);
        else cards[d.parent.id] = [updateData];
      }
      return cards;
    }, {});

    await Cards.implementation.updateDocuments(cardStackUpdates);

    for (const [id, updates] of Object.entries(processedUpdates)) {
      await game.cards.get(id).updateEmbeddedDocuments("Card", updates);
    }
    this.layer.clearPreviewContainer();
  }

}
