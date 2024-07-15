import {MODULE_ID} from "../helpers.mjs";
import {placeCard} from "./singles.mjs";

/**
 * Creates a grid of placed cards
 * @param {object} config                       Mandatory configuration object
 * @param {Cards} config.from                   The Cards document to draw from
 * @param {Cards} config.to                     The Cards document to put the cards into
 * @param {number} config.rows                  Number of rows to layout
 * @param {number} config.columns               Number of columns to layout
 * @param {object} [options]                    Options modifying the layout
 * @param {number} [options.how=0]              How to draw, a value from CONST.CARD_DRAW_MODES
 * @param {object} [options.updateData={}]      Modifications to make to each Card as part of
 *                                              the draw operation, for example the displayed face
 * @param {number} [options.horizontalSpacing]  Spacing between cards horizontally
 *                                              Defaults to `canvas.grid.sizeX`
 * @param {number} [options.verticalSpacing]    Spacing between cards vertically
 *                                              Defaults to `canvas.grid.sizeY`
 * @param {number} [options.defaultWidth=2]     Default width of a card in grid squares
 * @param {number} [options.defaultHeight=3]    Default height of a card in grid squares
 * @param {number} [options.offsetX]            Adjust X offset from the top left of the scene
 * @param {number} [options.offsetY]            Adjust Y offset from the top left of the scene
 */
export async function grid(config, options = {}) {
  if (!canvas.scene) throw new Error("Not viewing a canvas to place cards");
  if (config.from.type !== "deck") throw new Error("You can only create a grid from a deck");
  if (!canvas.scene.canUserModify(game.user, "update")) throw new Error("Placing a card requires updating the scene");
  const {sceneHeight, sceneWidth, sceneX, sceneY} = canvas.dimensions;
  const cardWidth = canvas.grid.sizeX * (options.defaultWidth ?? 2);
  const cardHeight = canvas.grid.sizeY * (options.defaultHeight ?? 3);
  const spacing = {
    x: options.horizontalSpacing ?? canvas.grid.sizeX,
    y: options.verticalSpacing ?? canvas.grid.sizeY
  };
  // Only need spacing between cards, not either end, so 1 less than # cards
  const totalHeight = config.rows * (spacing.y + cardHeight) - spacing.y;
  const totalWidth = config.columns * (spacing.x + cardWidth) - spacing.x;
  if ((totalWidth > sceneWidth) || (totalHeight > sceneHeight)) throw new Error("Not enough room on canvas to place cards");
  const drawCount = config.rows * config.columns;
  const cards = await config.to.draw(config.from, drawCount, {
    how: options.how,
    updateData: options.updateData ?? {}
  });

  const offsetX = sceneX + (options.offsetX ?? 0);
  const offsetY = sceneY + (options.offsetY ?? 0);

  const updateData = [];

  for (let i = 0; i < config.rows; i++) {
    for (let j = 0; j < config.columns; j++) {
      const card = cards[j * config.rows + i];
      const cardUpdate = {
        _id: card._id,
        flags: {
          [MODULE_ID]: {
            [canvas.scene.id]: {
              x: offsetX + j * (cardWidth + spacing.x),
              y: offsetY + i * (cardHeight + spacing.y),
              rotation: card.rotation,
              sort: card.sort
            }
          }
        }
      };
      updateData.push(cardUpdate);
    }
  }

  await config.to.updateEmbeddedDocuments("Card", updateData);
  const currentCards = new Set(canvas.scene.getFlag(MODULE_ID, "cardCollection")).union(
    new Set(cards.map((card) => card.uuid))
  );
  await canvas.scene.setFlag(MODULE_ID, "cardCollection", Array.from(currentCards));
}
