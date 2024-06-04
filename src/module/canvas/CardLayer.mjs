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
      rotateableObjects: true,
      zIndex: 100
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
    return canvas.hud.cards;
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
    itf.cardCollection = new foundry.utils.Collection();

    // Layer functionality
    // Inherited from InteractionLayer
    this.hitArea = canvas.dimensions.rect;
    this.zIndex = this.getZIndex();

    // Re-implementation of PlaceablesLayer._draw
    this.objects = this.addChild(new PIXI.Container());
    this.objects.sortableChildren = true;
    this.objects.visible = false;
    this.objects.sortChildren = CardLayer.#sortObjectsByElevationAndSort;
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
    this.objects.visible = true;
  }

  /**
   * The method to sort the objects elevation and sort before sorting by the z-index.
   * @type {Function}
   */
  static #sortObjectsByElevationAndSort = function() {
    for (let i = 0; i < this.children.length; i++) {
      this.children[i]._lastSortedIndex = i;
    }
    this.children.sort((a, b) => (a.document.elevation - b.document.elevation)
      || (a.document.sort - b.document.sort)
      || (a.zIndex - b.zIndex)
      || (a._lastSortedIndex - b._lastSortedIndex)
    );
    this.sortDirty = false;
  };

  /** @override */
  async _onDeleteKey(event) {
    if (game.paused && !game.user.isGM) {
      ui.notifications.warn("GAME.PausedWarning", {localize: true});
      return;
    }

    // Identify objects which are candidates for deletion
    const objects = this.options.controllableObjects ? this.controlled : (this.hover ? [this.hover] : []);
    if (!objects.length) return;

    // Restrict to objects which can be deleted
    const ids = objects.reduce((ids, o) => {
      const isDragged = (o.interactionState === MouseInteractionManager.INTERACTION_STATES.DRAG);
      if (isDragged || o.document.locked || !o.document.canUserModify(game.user, "delete")) return ids;
      if (this.hover === o) this.hover = null;
      ids.push(o.id);
      return ids;
    }, []);
    if (ids.length) {
      if (this.options.confirmDeleteKey) {
        const confirmed = await foundry.applications.api.DialogV2.confirm({
          window: {
            title: game.i18n.format("DOCUMENT.Delete", {type: this.constructor.documentName}),
            icon: "fa-solid fa-cards"
          },
          position: {
            width: 400,
            height: "auto"
          },
          content: `<p>${game.i18n.localize("AreYouSure")}</p>`,
          rejectClose: false,
          modal: true
        });
        if (!confirmed) return;
      }
      for (const uuid of ids) {
        const d = fromUuidSync(uuid);
        await d.unsetFlag(MODULE_ID, canvas.scene.id);
      }
      const cardCollection = new Set(canvas.scene.getFlag(MODULE_ID, "cardCollection"));
      const deletedCards = new Set(ids);
      await canvas.scene.setFlag(MODULE_ID, "cardCollection", Array.from(cardCollection.difference(deletedCards)));

      if (ids.length !== 1) {
        ui.notifications.info(game.i18n.format("CONTROLS.DeletedObjects", {
          count: ids.length, type: this.constructor.documentName
        }));
      }
      canvas.interface.draw();
    }
  }
}
