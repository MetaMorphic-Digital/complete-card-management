import CardObject from "./CardObject.mjs";
import {MODULE_ID} from "../helpers.mjs";

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
      // The reference here may cause issues on scene swap
      const obj = (doc._object = this.createObject(doc));
      this.objects.addChild(obj);
      return obj.draw();
    });

    // Wait for all objects to draw
    await Promise.all(promises);
    this.objects.visible = this.active;
  }
}
