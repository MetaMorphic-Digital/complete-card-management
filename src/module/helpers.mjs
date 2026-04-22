export const MODULE_ID = "complete-card-management";
export const MoveCardType = `${MODULE_ID}.moveCard`;

/**
 * @import {DatabaseWriteOperation} from "@common/abstract/_types.mjs"
 * @import Cards from "@client/documents/cards.mjs"
 */

/**
 * A batch of updates for Complete Card Management. The key "cardStackUpdates" is reserved for Cards document updates,
 * while all other keys are the IDs of parent cards documents.
 * @typedef {Record<string, Array<{ _id: string } & Record<string, unknown>>>} CCMBatch
 */

/**
 * Helper function to produce updates, potentially skipping over locked documents.
 * @param {string} valuePath    - Path on the Card document.
 * @param {(original?: any) => any} valueMod - Callback to transform the fetched value.
 * @param {object} [object] - Object to fetch values from, otherwise it uses each individual card.
 * @param {string} [targetPath] - Path of value to fetch.
 * @param {boolean} [ignoreLock=false] - Whether to allow updating a locked card.
 * @return {CCMBatch} The updates categorized by parent document ID.
 */
export function generateUpdates(valuePath, valueMod, { object, targetPath = "", ignoreLock = false } = {}) {
  let fetchedValue;
  if (object) fetchedValue = foundry.utils.getProperty(object, targetPath);
  const updates = canvas.cards.controlled.reduce((cards, o) => {
    if (!ignoreLock && o.document.locked) return cards;
    const d = fromUuidSync(o.id);
    const updateData = {
      _id: d.id,
      [valuePath]: valueMod(fetchedValue === undefined ? o : fetchedValue),
    };
    if (d instanceof Cards) {
      cards.cardStackUpdates.push(updateData);
    } else {
      const parentSlot = cards[d.parent.id];
      if (parentSlot) parentSlot.push(updateData);
      else cards[d.parent.id] = [updateData];
    }
    return cards;
  }, { cardStackUpdates: [] });

  return updates;
}

/* -------------------------------------------------- */

/**
 * Loops through an array of updates matching the ID of cards to an update array for their embedded collection.
 * @param {CCMBatch} processedUpdates
 * @returns {Promise<Document[][]>} The updated documents.
 */
export async function processUpdates(processedUpdates) {
  /** @type {DatabaseWriteOperation[]} */
  const operation = [];
  for (const [id, updates] of Object.entries(processedUpdates)) {
    if (id === "cardStackUpdates") operation.push({ updates, action: "update", documentName: "Cards" });
    else operation.push({ updates, action: "update", parent: game.cards.get(id), documentName: "Card" });
  }
  return foundry.documents.modifyBatch(operation);
}

/* -------------------------------------------------- */

/**
 * Loop through player hands to see if the PlayerList needs to be re-rendered.
 * @param {Card} card - The card being created or deleted.
 * @param {"create" | "delete"} action
 */
export function checkHandDisplayUpdate(card, action) {
  let render = false;

  for (const user of game.users) {
    const showCardCount = user.getFlag(MODULE_ID, "showCardCount");
    if (!showCardCount) continue;
    const handId = user.getFlag(MODULE_ID, "playerHand");
    const hand = game.cards.get(handId);
    render ||= card.parent === hand;
  }

  if (render) {
    if (action === "delete") setTimeout(() => ui.players.render(), 100);
    else ui.players.render();
  }
}
