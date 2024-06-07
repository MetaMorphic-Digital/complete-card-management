export const MODULE_ID = "complete-card-management";

/**
 * Loops through an array of updates matching the ID of cards to an update array for their embedded collection
 * @param {Record<string, Array<{ _id: string } & Record<string, unknown>>>} processedUpdates
 */
export async function processUpdates(processedUpdates) {
  for (const [id, updates] of Object.entries(processedUpdates)) {
    await game.cards.get(id).updateEmbeddedDocuments("Card", updates);
  }
}
