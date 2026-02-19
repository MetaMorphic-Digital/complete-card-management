import CardObject from "./CardObject.mjs";
import {MODULE_ID, generateUpdates, processUpdates} from "../helpers.mjs";
import CanvasCard from "./CanvasCard.mjs";
import {gridDialog, triangleDialog} from "../api/layout.mjs";

/** @import {PlaceablesLayerOptions} from "@client/canvas/layers/_types.mjs" */

/**
 * The main Card layer
 */
export default class CardLayer extends foundry.canvas.layers.PlaceablesLayer {
  // "Card" is not a valid document name within the scene document
  static documentName = "Card";

  /**
   * Configuration options for the CardLayer
   * @returns {PlaceablesLayerOptions}
   */
  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, {
      name: "cards",
      controllableObjects: true,
      rotatableObjects: true,
      zIndex: -100
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

  /** @inheritdoc */
  get hud() {
    return canvas.hud.cards;
  }

  // TODO: investigate if there's caching performance improvements
  /** @inheritdoc */
  get documentCollection() {
    const activeScene = canvas.scene;
    if (!activeScene) return null;
    const uuids = activeScene.getFlag(MODULE_ID, "cardCollection") ?? [];
    return uuids.reduce((coll, uuid) => {
      const doc = fromUuidSync(uuid);
      if (doc) coll.set(uuid, doc);
      return coll;
    }, new foundry.utils.Collection());
  }

  /** @inheritdoc */
  getMaxSort() {
    let sort = -Infinity;
    const collection = this.documentCollection;
    for (const document of collection) sort = Math.max(sort, document.canvasCard.sort);
    return sort;
  }

  /** @inheritdoc */
  async _sendToBackOrBringToFront(front) {
    if (!this.controlled.length) return true;

    // Determine to-be-updated objects and the minimum/maximum sort value of the other objects
    const toUpdate = [];
    let target = front ? -Infinity : Infinity;
    for (const document of this.documentCollection) {
      if (!document.canvasCard) continue;
      if (document.canvasCard?.object?.controlled && !document.locked) toUpdate.push(document);
      else target = (front ? Math.max : Math.min)(target, document.canvasCard.sort);
    }
    if (!Number.isFinite(target)) return true;
    target += (front ? 1 : -toUpdate.length);

    // Sort the to-be-updated objects by sort in ascending order
    toUpdate.sort((a, b) => a.sort - b.sort);

    // Update the to-be-updated objects
    const updates = toUpdate.reduce((cards, card, i) => {
      const parentSlot = cards[card.id];
      const updateData = {_id: card.id};
      foundry.utils.setProperty(updateData, `flags.${MODULE_ID}.${canvas.scene.id}.sort`, target + i);
      if (parentSlot) parentSlot.push(updateData);
      else cards[card.parent.id] = [updateData];
      return cards;
    }, {});

    await processUpdates(updates);

    return true;
  }

  /** @inheritdoc */
  getSnappedPoint(point) {
    if (canvas.forceSnapVertices) return canvas.grid.getSnappedPoint(point, {mode: CONST.GRID_SNAPPING_MODES.VERTEX});
    return super.getSnappedPoint(point);
  }

  /** @inheritdoc */
  async _draw(options) {

    // Setting up the group functionality
    /** @type {InterfaceCanvasGroup} */
    const itf = this.parent;
    itf.cardCollection = new foundry.utils.Collection();
    itf.cardMeshes = itf.addChild(new PIXI.Container());
    itf.cardMeshes.sortChildren = CardLayer.#sortMeshesByElevationAndSort;
    itf.cardMeshes.sortableChildren = true;
    itf.cardMeshes.eventMode = "none";
    itf.cardMeshes.interactiveChildren = false;
    itf.cardMeshes.zIndex = this.getZIndex();

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

    /** @type {Array<Card | Cards>} */
    const documents = this.getDocuments();
    const promises = documents.map((doc) => {
      // Preemptively filtering out drawings that would fail
      const data = doc.getFlag(MODULE_ID, canvas.scene.id);
      if (!data || (data.x === undefined) || (data.y === undefined)) {
        console.warn("No canvas data found for", doc.name);
        return;
      }
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

  /** @inheritdoc */
  static prepareSceneControls() {
    return {
      name: "cards",
      order: 12,
      title: "CCM.CardLayer.Title",
      layer: "cards",
      icon: CONFIG.Cards.sidebarIcon,
      onChange: (event, active) => {
        if (active) canvas.cards.activate();
      },
      onToolChange: () => canvas.cards.setAllRenderFlags({refreshState: true}),
      tools: {
        select: {
          name: "select",
          order: 1,
          title: "CCM.CardLayer.Tools.SelectTitle",
          icon: "fa-solid fa-expand"
        },
        snap: {
          name: "snap",
          order: 2,
          title: "CONTROLS.CommonForceSnap",
          icon: "fa-solid fa-plus",
          toggle: true,
          active: canvas.forceSnapVertices,
          onChange: (event, toggled) => canvas.forceSnapVertices = toggled
        },
        createGrid: {
          name: "createGrid",
          order: 3,
          title: "CCM.CardLayer.Tools.CreateGrid",
          icon: "fa-solid fa-square",
          button: true,
          onChange: (event) => gridDialog()
        },
        createTriangle: {
          name: "createTriangle",
          order: 3,
          title: "CCM.CardLayer.Tools.CreateTriangle",
          icon: "fa-solid fa-triangle",
          button: true,
          onChange: (event) => triangleDialog()
        },
        delete: {
          name: "delete",
          order: 5,
          title: "CCM.CardLayer.Tools.ClearTitle",
          icon: "fa-solid fa-trash",
          visible: game.user.isGM,
          button: true,
          onChange: (event, toggled) => canvas.cards.deleteAll()
        }
      },
      activeTool: "select"
    };
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

  static #sortMeshesByElevationAndSort = function() {
    for (let i = 0; i < this.children.length; i++) {
      this.children[i]._lastSortedIndex = i;
    }
    this.children.sort((a, b) => {
      const a_uuid = a.name.endsWith(".preview") ? a.name.slice(0, a.name.length - ".preview".length) : a.name;
      const b_uuid = b.name.endsWith(".preview") ? b.name.slice(0, b.name.length - ".preview".length) : b.name;
      const adoc = fromUuidSync(a_uuid)?.canvasCard;
      const bdoc = fromUuidSync(b_uuid)?.canvasCard;
      return (adoc?.elevation - bdoc?.elevation)
      || (adoc?.sort - bdoc?.sort)
      || (a.zIndex - b.zIndex)
      || (a._lastSortedIndex - b._lastSortedIndex);
    });
    this.sortDirty = false;
  };

  /** @inheritdoc */
  async rotateMany({angle, delta, snap, ids, includeLocked = false} = {}) {

    if ((angle ?? delta ?? null) === null) {
      throw new Error("Either a target angle or relative delta must be provided.");
    }

    // Rotation is not permitted
    if (!this.options.rotatableObjects) return [];
    if (game.paused && !game.user.isGM) {
      ui.notifications.warn("GAME.PausedWarning", {localize: true});
      return [];
    }

    // Identify the objects requested for rotation
    const objects = this._getMovableObjects(ids, includeLocked);
    if (!objects.length) return objects;

    // Conceal any active HUD
    this.hud?.clear();

    const updates = generateUpdates(
      `flags.${MODULE_ID}.${canvas.scene.id}.rotation`,
      (o) => o._updateRotation({angle, delta, snap}),
      {targetPath: "rotation"}
    );
    await processUpdates(updates);
    return objects;
  }

  /** @inheritdoc */
  async deleteAll() {
    const type = this.constructor.documentName;
    if (!game.user.isGM) {
      throw new Error(`You do not have permission to delete ${type} objects from the Scene.`);
    }
    const proceed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: "CONTROLS.ClearAll",
        icon: "fa-solid fa-cards"
      },
      classes: ["ccm"],
      content: game.i18n.format("CONTROLS.ClearAllHint", {type}),
      rejectClose: false,
      modal: true
    });
    if (proceed) {
      const cardCollection = canvas.scene.getFlag(MODULE_ID, "cardCollection");
      if (!cardCollection) {
        ui.notifications.warn("CARDS.NoCards", {localize: true});
        return null;
      }
      for (const uuid of cardCollection) {
        const card = fromUuidSync(uuid);
        if (!card) continue;
        await card.unsetFlag(MODULE_ID, canvas.scene.id);
      }
      ui.notifications.info(game.i18n.format("CONTROLS.DeletedObjects", {count: cardCollection.length, type}));
      return canvas.scene.unsetFlag(MODULE_ID, "cardCollection");
    }
  }

  /** @inheritdoc */
  _getCopyableObjects(options) {
    ui.notifications.warn("CCM.Warning.NoCopyCutPaste", {localize: true});
    return [];
  }

  /** @inheritdoc */
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
      const isDragged = (o.interactionState === foundry.canvas.interaction.MouseInteractionManager.INTERACTION_STATES.DRAG);
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
          classes: ["ccm"],
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
