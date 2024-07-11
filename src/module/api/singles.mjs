import {MODULE_ID} from "../helpers.mjs";

/**
 * Places a card on the scene or updates its location
 * @param {Card | Cards} card - Card or Cards to place
 * @param {object} data       - Data for the CanvasCard
 * @param {number} data.x     - Center of the card's horizontal location
 * @param {number} data.y     - Center of the card's vertical location
 */
export async function placeCard(card, data = {}) {
  if (!canvas.scene) throw new Error("Not viewing a canvas to place cards");
  if (isNaN(data.x) || isNaN(data.y)) throw new Error("You must provide numerical x and y canvas coordinates");
  if (!canvas.scene.testUserPermission(game.user, "update")) throw new Error("Placing a card requires updating the scene");
  const sceneId = canvas.scene.id;
  data.x = Math.clamp(data.x - ((card.width ?? 2) * canvas.grid.sizeX) / 2, 0, canvas.dimensions.width);
  data.y = Math.clamp(data.y - ((card.height ?? 3) * canvas.grid.sizeY) / 2, 0, canvas.dimensions.height);
  data.rotation = data.rotation ?? card.rotation;
  data.sort = data.sort ?? card.sort;
  const currentCards = new Set(canvas.scene.getFlag(MODULE_ID, "cardCollection")).add(card.uuid);
  await canvas.scene.setFlag(MODULE_ID, "cardCollection", Array.from(currentCards));
  return card.setFlag(MODULE_ID, sceneId, data);
}

/**
 * Removes a card from the scene
 * @param {Card | Cards} card
 * @returns
 */
export async function removeCard(card) {
  if (!canvas.scene) throw new Error("Not viewing a canvas to place cards");
  const sceneId = canvas.scene.id;
  return card.unsetFlag(MODULE_ID, sceneId);
}

/**
 * Purges cards without relevant CanvasCard data from the current scene
 */
export async function cleanCardCollection() {
  if (!canvas.scene) throw new Error("You must be viewing a scene to clean its collection");
  if (!canvas.scene.testUserPermission(game.user, "update")) throw new Error("This function requires updating the scene");
  const currentCards = new Set(canvas.scene.getFlag(MODULE_ID, "cardCollection"));
  const refreshed = [];
  for (const uuid of currentCards) {
    const card = fromUuidSync(uuid);
    if (!card) continue;
    if (card.getFlag(MODULE_ID, canvas.scene.id)) refreshed.push(uuid);
  }
  return canvas.scene.setFlag(MODULE_ID, "cardCollection", refreshed);
}
