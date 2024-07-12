import {MODULE_ID} from "../helpers.mjs";

/**
 * Places a card on the scene or updates its location
 * @param {Card | Cards} card      Card or Cards to place
 * @param {object} data            Data for the CanvasCard
 * @param {number} data.x          Center of the card's horizontal location
 * @param {number} data.y          Center of the card's vertical location
 * @param {number} [data.rotation] Center of the card's horizontal location
 * @param {number} [data.sort]     Center of the card's vertical location
 * @returns {Card | Card}          The updated document
 */
export async function placeCard(card, data = {}) {
  if (!canvas.scene) throw new Error("Not viewing a canvas to place cards");
  if (isNaN(data.x) || isNaN(data.y)) throw new Error("You must provide numerical x and y canvas coordinates");
  if (!canvas.scene.canUserModify(game.user, "update")) throw new Error("Placing a card requires updating the scene");
  const sceneId = canvas.scene.id;
  const canvasCardData = {
    x: Math.clamp(data.x - ((card.width ?? 2) * canvas.grid.sizeX) / 2, 0, canvas.dimensions.width),
    y: Math.clamp(data.y - ((card.height ?? 3) * canvas.grid.sizeY) / 2, 0, canvas.dimensions.height),
    rotation: data.rotation ?? card.rotation,
    sort: data.sort ?? card.sort
  };
  const currentCards = new Set(canvas.scene.getFlag(MODULE_ID, "cardCollection")).add(card.uuid);
  await canvas.scene.setFlag(MODULE_ID, "cardCollection", Array.from(currentCards));
  return card.setFlag(MODULE_ID, sceneId, canvasCardData);
}

/**
 * Removes a card from the scene
 * @param {Card | Cards} card
 * @returns {Promise<Card | Cards>}      A promise that resolves to the updated card or cards document.
 */
export async function removeCard(card) {
  if (!canvas.scene) throw new Error("Not viewing a canvas to place cards");
  const sceneId = canvas.scene.id;
  return card.unsetFlag(MODULE_ID, sceneId);
}

/**
 * Purges cards without relevant CanvasCard data from the current scene
 * @returns {Scene} The updated scene
 */
export async function cleanCardCollection() {
  if (!canvas.scene) throw new Error("You must be viewing a scene to clean its collection");
  if (!canvas.scene.canUserModify(game.user, "update")) throw new Error("This function requires updating the scene");
  const currentCards = new Set(canvas.scene.getFlag(MODULE_ID, "cardCollection"));
  const refreshed = [];
  for (const uuid of currentCards) {
    const card = fromUuidSync(uuid);
    if (!card) continue;
    if (card.getFlag(MODULE_ID, canvas.scene.id)) refreshed.push(uuid);
  }
  return canvas.scene.setFlag(MODULE_ID, "cardCollection", refreshed);
}
