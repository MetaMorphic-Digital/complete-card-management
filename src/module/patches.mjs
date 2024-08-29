/**
 * Add a CardObject to the layer
 *
 * @this InterfaceCanvasGroup
 * @param {import('./CardObject.mjs').CardObject} card The CardObject being added
 * @returns {PIXI.Graphics} The created Graphics instance
 */
export function addCard(card) {
  const name = card.objectId;
  const mesh = this.cardCollection.get(name) ?? this.cardMeshes.addChild(new SpriteMesh(card.texture));
  mesh.texture = card.texture ?? PIXI.Texture.EMPTY;
  mesh.name = name;
  this.cardCollection.set(name, mesh);
  return mesh;
}

/**
 * Remove a CardObject from the layer
 *
 * @this InterfaceCanvasGroup
 * @param {import('./CardObject.mjs').CardObject} card The CardObject being added
 */
export function removeCard(card) {
  const name = card.objectId;
  const mesh = this.cardCollection.get(name);
  if (mesh?.destroyed === false) mesh.destroy({children: true});
  this.cardCollection.delete(name);
}
