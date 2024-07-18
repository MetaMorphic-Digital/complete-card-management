/**
 * Recall a drawn card from a deck.
 * @param {Cards} deck          The deck to recall a drawn card to.
 * @param {string} cardId       The id of the card to recall.
 * @returns {Promise<Card>}     A reference to the recalled card belonging to its original parent.
 */
export default async function recallCard(deck, cardId) {
  if (deck.type !== "deck") {
    console.warn("You can only recall a card to a Deck.");
    return;
  }
  const card = deck.cards.get(cardId);
  if (!card) {
    console.warn("The card to be recalled does not exist in this Deck.");
    return;
  }
  if (!card.drawn) {
    console.warn("A card that has not been drawn cannot be recalled.");
    return;
  }
  const clone = findClone(card);
  ChatMessage.implementation.create({
    content: game.i18n.format("CCM.CardSheet.RecalledCard", {
      card: card.link,
      deck: deck.link
    })
  });
  return clone ? clone.recall() : card.recall();
}

/**
 * Find the "clone" of a card in a hand or pile.
 * @param {Card} card       The card of which to find a clone.
 * @returns {Card|void}     The clone if any is found.
 */
function findClone(card) {
  for (const cards of game.cards) {
    if (cards.type === "deck") continue;
    const c = cards.cards.find(c => {
      return (c.source === card.parent) && (c.id === card.id);
    });
    if (c) return c;
  }
}
