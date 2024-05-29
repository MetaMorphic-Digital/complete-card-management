import CardObject from "./CardObject.mjs";
import {MODULE_ID} from "../helpers.mjs";
import CanvasCard from "./CanvasCard.mjs";

/**
 * The main Card lay
 */
export default class CardLayer extends PlaceablesLayer {
  // "Card" is not a valid document name within the scene document
  static documentName = "Card";

  /**
   * Configuration options for the CardLayer
   *
   * @returns {import("../_types.mjs").PlaceablesLayerOptions} The Options
   */
  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, {
      name: "cards",
      controllableObjects: true,
      rotateableObjects: true
    });
  }

  /**
   * The collection of card objects which are rendered in the interface.
   *
   * @type {Map<string, CardObject>}
   */
  graphics = new foundry.utils.Collection();

  /**
   * The name used by hooks to construct their hook string.
   *
   * @returns {string} The name
   */
  get hookName() {
    return CardLayer.name;
  }

  /** @override */
  get hud() {
    return canvas.hud.canvas;
  }

  // TODO: investigate if there's caching performance improvements
  /** @override */
  get documentCollection() {
    const activeScene = canvas.scene;
    if (!activeScene) return null;
    const uuids = activeScene.getFlag(MODULE_ID, "cardCollection") ?? [];
    return new foundry.utils.Collection(
      uuids.map((uuid) => [uuid, fromUuidSync(uuid)])
    );
  }

  /** @override */
  async _draw(options) {
    // Setting up the group functionality
    const itf = this.parent;
    itf.cardContainer = itf.addChild(new PIXI.Container());
    itf.cardContainer.sortChildren = function() {
      const children = this.children;
      for (let i = 0, n = children.length; i < n; i++) children[i]._lastSortedIndex = i;
      children.sort((a, b) => {
        return ((a.elevation || 0) - (b.elevation || 0))
          || ((a.sort || 0) - (b.sort || 0))
          || (a.zIndex - b.zIndex)
          || (a._lastSortedIndex - b._lastSortedIndex);
      });
      this.sortDirty = false;
    };
    itf.cardContainer.sortableChildren = true;
    itf.cardContainer.eventMode = "none";
    itf.cardContainer.zIndex = CONFIG.Canvas.groups.interface.zIndexDrawings;

    // Layer functionality
    this.hitArea = canvas.dimensions.rect;
    this.zIndex = this.getZIndex();

    this.objects = this.addChild(new PIXI.Container());
    this.objects.sortableChildren = true;
    this.objects.visible = false;
    // const cls = getDocumentClass(this.constructor.documentName);
    this.objects.sortChildren = null;
    this.objects.on("childAdded", (obj) => {
      if (obj instanceof CardObject) {
        obj._updateQuadtree();
      }
    });
    this.objects.on("childRemoved", (obj) => {
      if (obj instanceof CardObject) {
        obj._updateQuadtree();
      }
    });

    this.preview = this.addChild(new PIXI.Container());

    const documents = this.getDocuments();
    const promises = documents.map((doc) => {
      const syntheticDoc = new CanvasCard(doc);
      const obj = (syntheticDoc._object = this.createObject(syntheticDoc));
      this.objects.addChild(obj);
      return obj.draw();
    });

    // Wait for all objects to draw
    await Promise.all(promises);
    this.objects.visible = this.active;
  }
}
