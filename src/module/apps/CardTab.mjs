import CanvasCard from "../canvas/CanvasCard.mjs";
import CardFilter from "./CardFilter.mjs";
import { MODULE_ID } from "../helpers.mjs";

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
    context.entries = await Promise.all(promises);
    context.entries.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve the Document instance represented by the given entry's element.
   * @param {HTMLElement} element
   * @returns {Document}
   * @protected
   */
  _getPlaceableFromElement(element) {
    const { entryId } = element.closest("[data-entry-id]")?.dataset ?? {};
    const uuid = canvas.scene.getFlag(MODULE_ID, "cardCollection").find(uuid => uuid.endsWith(entryId));
    return fromUuidSync(uuid)?.canvasCard;
  }
}
