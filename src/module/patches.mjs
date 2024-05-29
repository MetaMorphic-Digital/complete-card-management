/**
 * Add a CardObject to the layer
 *
 * @this InterfaceCanvasGroup
 * @param {import('./CardObject.mjs').CardObject} card The CardObject being added
 * @returns {PIXI.Graphics} The created Graphics instance
 */
export function addCard(card) {
  const name = card.objectId;
  const shape = this.cards.graphics.get(name) ?? this.cardContainer.addChild(new PIXI.Graphics());
  shape.name = name;
  this.cards.graphics.set(name, shape);
  console.log(shape);
  return shape;
}

/**
 * Remove a CardObject from the layer
 *
 * @this InterfaceCanvasGroup
 * @param {import('./CardObject.mjs').CardObject} card The CardObject being added
 */
export function removeCard(card) {
  const name = card.objectId;
  if (!this.cards.graphics.has(name)) return;
  const shape = this.cards.graphics.get(name);
  if (shape?.destroyed === false) shape.destroy({children: true});
  this.cards.graphics.delete(name);
}
