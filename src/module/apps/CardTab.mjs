import { MODULE_ID, generateUpdates, processUpdates } from "../helpers.mjs";
import CanvasCard from "../canvas/CanvasCard.mjs";
import CardFilter from "./CardFilter.mjs";

/**
 * The Card and Cards-specific placeables tab.
 */
export default class CardTab extends foundry.applications.sidebar.tabs.PlaceableTab {
  /** @inheritdoc */
  constructor(...args) {
    super(...args);
    Object.assign(this._filterState, {});
  }

  /* -------------------------------------------------- */

  /** @override */
  static DIRECTORY_PARTIAL = "modules/complete-card-management/templates/sidebar/tabs/placeable/cards.hbs";

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static FILTER_CLASS = CardFilter;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get documentClass() {
    return CanvasCard;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get layer() {
    return canvas.cards;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareDirectoryContext(context, options) {
    const controlled = Object.fromEntries(this.layer.controlled.map(o => [o.id, o]));
    context.directoryPartial = this.constructor.DIRECTORY_PARTIAL;
    context.entryPartial = this.constructor.ENTRY_PARTIAL;
    const promises = [];
    for (const entry of canvas.cards?.documentCollection ?? []) {
      if (!entry.visible) continue;
      const { id } = entry;
      const css = id in controlled ? "active" : "";
      const ctx = { css, id, label: this._getEntryLabel(entry) };
      promises.push(this._prepareEntry(entry, ctx));
    }
    const entries = await Promise.all(promises);
    entries.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));

    context.groups = { cardStacks: {
      label: _loc(foundry.documents.Cards.metadata.labelPlural),
      entries: [],
    } };

    for (const entry of entries) {
      if (entry.parent) {
        const g = context.groups[entry.parent] ??= {
          label: game.cards.get(entry.parent).name,
          entries: [],
        };

        g.entries.push(entry);
      }
      else context.groups.cardStacks.entries.push(entry);
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareEntry(entry, context) {
    context = await super._prepareEntry(entry, context);
    context.parent = entry.parent?.id;
    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareSearchContext(context, options) {
    context = await super._prepareSearchContext(context, options);

    context.filters.findSplice(f => f.action === "filterByLevel");

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onToggleHidden(event, target) {
    const canvasCard = this._getPlaceableFromElement(target);
    if (!canvasCard) return;
    if (canvas.ready && canvasCard.rendered && canvasCard.object.controlled) {
      const updates = generateUpdates(
        `flags.${MODULE_ID}.${canvas.scene.id}.hidden`,
        o => !o,
        { object: canvasCard, targetPath: "hidden", ignoreLock: true },
      );
      await processUpdates(updates);
    }
    else await canvasCard.card.update({ [`flags.${MODULE_ID}.${canvas.scene.id}.hidden`]: !canvasCard.hidden });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onToggleLocked(event, target) {
    const canvasCard = this._getPlaceableFromElement(target);
    if (!canvasCard) return;
    if (canvas.ready && canvasCard.rendered && canvasCard.object.controlled) {
      const updates = generateUpdates(
        `flags.${MODULE_ID}.${canvas.scene.id}.locked`,
        o => !o,
        { object: canvasCard, targetPath: "locked", ignoreLock: true },
      );
      return processUpdates(updates);
    }
    else await canvasCard.card.update({ [`flags.${MODULE_ID}.${canvas.scene.id}.locked`]: !canvasCard.locked });
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve the synthetic document instance represented by the given entry's element.
   * @param {HTMLElement} element
   * @returns {CanvasCard}
   * @protected
   */
  _getPlaceableFromElement(element) {
    const { entryId } = element.closest("[data-entry-id]")?.dataset ?? {};
    const uuid = canvas.scene.getFlag(MODULE_ID, "cardCollection").find(uuid => uuid.endsWith(entryId));
    return fromUuidSync(uuid)?.canvasCard;
  }
}
