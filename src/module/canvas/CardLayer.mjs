import CardObject from "./CardObject.mjs";
import {MODULE_ID, processUpdates} from "../helpers.mjs";
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
  async _sendToBackOrBringToFront(front) {
    if (!this.controlled.length) return true;

    // Determine to-be-updated objects and the minimum/maximum sort value of the other objects
    const toUpdate = [];
    let target = front ? -Infinity : Infinity;
    for (const document of this.documentCollection) {
      if (document.object?.controlled && !document.locked) toUpdate.push(document);
      else target = (front ? Math.max : Math.min)(target, document.sort);
    }
    if (!Number.isFinite(target)) return true;
    target += (front ? 1 : -toUpdate.length);

    // Sort the to-be-updated objects by sort in ascending order
    toUpdate.sort((a, b) => a.sort - b.sort);

    // Update the to-be-updated objects
    const updates = toUpdate.reduce((cards, canvasCard, i) => {
      const d = fromUuidSync(canvasCard.id);
      const parentSlot = cards[d.parent.id];
      const updateData = {_id: d.id};
      foundry.utils.setProperty(updateData, `flags.${MODULE_ID}.${canvas.scene}.sort`, target + i);
      if (parentSlot) parentSlot.push(updateData);
      else cards[d.parent.id] = [updateData];
      return cards;
    }, {});

    await processUpdates(updates);

    return true;
  }

  /** @inheritDoc */
  getSnappedPoint(point) {
    if (canvas.forceSnapVertices) return canvas.grid.getSnappedPoint(point, {mode: CONST.GRID_SNAPPING_MODES.VERTEX});
    return super.getSnappedPoint(point);
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
      doc.canvasCard = syntheticDoc;
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
  async deleteAll() {
    const type = this.constructor.documentName;
    if (!game.user.isGM) {
      throw new Error(`You do not have permission to delete ${type} objects from the Scene.`);
    }
    const proceed = await foundry.applications.api.DialogV2.confirm({
      title: game.i18n.localize("CONTROLS.ClearAll"),
      content: game.i18n.format("CONTROLS.ClearAllHint", {type}),
      rejectClose: false,
      modal: true
    });
    if (proceed) {
      const cardCollection = canvas.scene.getFlag(MODULE_ID, "cardCollection");
      if (!cardCollection) return ui.notifications.warn();
      for (const uuid of cardCollection) {
        const card = fromUuidSync(uuid);
        await card.unsetFlag(MODULE_ID, canvas.scene.id);
      }
      ui.notifications.info(game.i18n.format("CONTROLS.DeletedObjects", {count: cardCollection.length, type}));
      return canvas.scene.unsetFlag(MODULE_ID, "cardCollection");
    }
  }

  /** @override */
  async _onDeleteKey(event) {
    if (game.paused && !game.user.isGM) {
      ui.notifications.warn("GAME.PausedWarning", {localize: true});
      return;
    }

    // Identify objects which are candidates for deletion
    const objects = this.controlled;
    if (!objects.length) return;

    // Restrict to objects which can be deleted
    const uuids = objects.reduce((objIds, o) => {
      const isDragged = (o.interactionState === MouseInteractionManager.INTERACTION_STATES.DRAG);
      if (isDragged || o.document.locked || !o.document.canUserModify(game.user, "delete")) return objIds;
      if (this.hover === o) this.hover = null;
      objIds.push(o.id);
      return objIds;
    }, []);
    if (uuids.length) {
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
      for (const uuid of uuids) {
        const d = fromUuidSync(uuid);
        await d.unsetFlag(MODULE_ID, canvas.scene.id);
      }
      const cardCollection = new Set(canvas.scene.getFlag(MODULE_ID, "cardCollection"));
      const deletedCards = new Set(uuids);
      await canvas.scene.setFlag(MODULE_ID, "cardCollection", Array.from(cardCollection.difference(deletedCards)));

      if (uuids.length !== 1) {
        ui.notifications.info(game.i18n.format("CONTROLS.DeletedObjects", {
          count: uuids.length, type: this.constructor.documentName
        }));
      }
    }
  }
}
