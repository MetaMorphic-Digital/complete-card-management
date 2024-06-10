export const MODULE_ID = "complete-card-management";
export const MoveCardType = MODULE_ID + ".moveCard";

/**
 * @param {string} valuePath    - Path on the Card document
 * @param {(original?: any) => any} valueMod - Callback to transform the fetched value
 * @param {object} [object] - Object to fetch values from
 * @param {string} [targetPath] - Path of value to fetch
 * @param {boolean} [ignoreLock=false] - Whether to allow updating a locked card
 * @returns
 */
export function generateUpdates(valuePath, valueMod, {object = {}, targetPath = "", ignoreLock = false} = {}) {
  const fetchedValue = foundry.utils.getProperty(object, targetPath);
  const updates = canvas.cards.controlled.reduce((cards, o) => {
    if (!ignoreLock && o.document.locked) return cards;
    const d = fromUuidSync(o.id);
    const parentSlot = cards[d.parent.id];
    const updateData = {
      _id: d.id,
      [valuePath]: valueMod(fetchedValue)
    };
    if (parentSlot) parentSlot.push(updateData);
    else cards[d.parent.id] = [updateData];
    return cards;
  }, {});

  return updates;
}

/**
 * Loops through an array of updates matching the ID of cards to an update array for their embedded collection
 * @param {Record<string, Array<{ _id: string } & Record<string, unknown>>>} processedUpdates
 */
export async function processUpdates(processedUpdates) {
  for (const [id, updates] of Object.entries(processedUpdates)) {
    await game.cards.get(id).updateEmbeddedDocuments("Card", updates);
  }
}
