export const MODULE_ID = "complete-card-management";
export const MoveCardType = `${MODULE_ID}.moveCard`;

/**
 * @param {string} valuePath    - Path on the Card document
 * @param {(original?: any) => any} valueMod - Callback to transform the fetched value
 * @param {object} [object] - Object to fetch values from, otherwise it uses each individual card
 * @param {string} [targetPath] - Path of value to fetch
 * @param {boolean} [ignoreLock=false] - Whether to allow updating a locked card
 * @returns
 */
export function generateUpdates(valuePath, valueMod, {object, targetPath = "", ignoreLock = false} = {}) {
  let fetchedValue;
  if (object) fetchedValue = foundry.utils.getProperty(object, targetPath);
  const updates = canvas.cards.controlled.reduce((cards, o) => {
    if (!ignoreLock && o.document.locked) return cards;
    const d = fromUuidSync(o.id);
    const updateData = {
      _id: d.id,
      [valuePath]: valueMod(fetchedValue === undefined ? o : fetchedValue)
    };
    if (d instanceof Cards) {
      cards.cardStackUpdates.push(updateData);
    } else {
      const parentSlot = cards[d.parent.id];
      if (parentSlot) parentSlot.push(updateData);
      else cards[d.parent.id] = [updateData];
    }
    return cards;
  }, {cardStackUpdates: []});

  return updates;
}

/* -------------------------------------------------- */

/**
 * Loops through an array of updates matching the ID of cards to an update array for their embedded collection
 * @param {Record<string, Array<{ _id: string } & Record<string, unknown>>>} processedUpdates
 */
export async function processUpdates(processedUpdates) {
  for (const [id, updates] of Object.entries(processedUpdates)) {
    if (id === "cardStackUpdates") await Cards.implementation.updateDocuments(updates);
    else await game.cards.get(id).updateEmbeddedDocuments("Card", updates);
  }
}

/* -------------------------------------------------- */

/**
 * Loop through player hands to see if the PlayerList needs to be re-rendered
 * @param {Card} card - The card being created or deleted
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
