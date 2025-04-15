import {placeCard} from "./api/singles.mjs";
import {MODULE_ID} from "./helpers.mjs";

export default class CCMSocketHandler {
  constructor() {
    /**
     * Identifier used for socket operations
     * @type {string}
     */
    this.identifier = "module.complete-card-management";
  }

  /* -------------------------------------------------- */

  /**
   * Sets up socket reception
   */
  registerSocketHandlers() {
    game.socket.on(this.identifier, ({type, payload}) => {
      switch (type) {
        case "passCardHandler":
          this.#passCardHandler(payload);
          break;
        case "placeCardHandler":
          this.#placeCardHandler(payload);
          break;
        case "updateEmbeddedCards":
          this.#updateEmbeddedCards(payload);
          break;
        default:
          throw new Error("Unknown type");
      }
    });
  }

  /* -------------------------------------------------- */

  /**
   * Emits a socket message to all other connected clients
   * @param {string} type
   * @param {object} payload
   */
  emit(type, payload) {
    return game.socket.emit(this.identifier, {type, payload});
  }

  /* -------------------------------------------------- */

  /**
   *
   * @param {object} payload                          The received data
   * @param {string[]} payload.cardCollectionRemovals Cards that have been removed from the viewed scene's cardCollection
   * @param {object} payload.originId                 The ID of the origin card stack
   * @param {object} payload.destinationId            The ID of the destination card stack
   */
  #passCardHandler(payload) {
    if (!game.user.isActiveGM) return;
    if (!canvas.scene) {
      console.error("Not viewing a scene to handle Card Layer updates");
      return;
    }
    const {cardCollectionRemovals, originId, destinationId} = payload;
    const cardCollection = new Set(canvas.scene.getFlag(MODULE_ID, "cardCollection"));
    for (const uuid of cardCollection) {
      if (!cardCollectionRemovals.includes(uuid)) continue;
      cardCollection.delete(uuid);
      cardCollection.add(uuid.replace(originId, destinationId));
      canvas.scene.setFlag(MODULE_ID, "cardCollection", Array.from(cardCollection));
    }
  }

  /* -------------------------------------------------- */

  /**
   * Delegate placing a card to the Active GM
   * @param {object} payload
   * @param {string} payload.uuid       UUID for the card to place
   * @param {string} payload.sceneId    ID for the scene to add the card to
   * @param {number} payload.x          Center of the card's horizontal location
   * @param {number} payload.y          Center of the card's vertical location
   * @param {number} [payload.rotation] Center of the card's horizontal location
   * @param {number} [payload.sort]     Center of the card's vertical location
   */
  #placeCardHandler(payload) {
    if (!game.user.isActiveGM) return;
    const {uuid, ...data} = payload;
    const card = fromUuidSync(uuid);
    placeCard(card, data);
  }

  /* -------------------------------------------------- */

  /**
   * Update cards embedded in a Cards document.
   * @param {object} payload                The received data.
   * @param {string} payload.uuid           The uuid of the Cards document whose cards to update.
   * @param {object[]} payload.updates      The array of updates to perform.
   * @param {string} payload.userId         The id of the user requested to perform the update.
   */
  #updateEmbeddedCards({uuid, updates, userId}) {
    if (game.user.id !== userId) return;
    const cards = fromUuidSync(uuid);
    cards.updateEmbeddedDocuments("Card", updates);
  }
}
