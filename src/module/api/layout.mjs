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
 * @param {number} [options.horizontalSpacing]
 * @param {number} [options.verticalSpacing]
 */
export async function grid(config, options = {}) {
  if (!canvas.scene) throw new Error("Not viewing a canvas to place cards");
  const {sceneHeight, sceneWidth, sceneX, sceneY} = canvas.dimensions;
  const cardWidth = canvas.grid.sizeX * 2;
  const cardHeight = canvas.grid.sizeY * 3;
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

  for (let i = 0; i < config.rows; i++) {
    for (let j = 0; j < config.columns; j++) {
      const index = j * config.rows + i;
      const x = sceneX + (cardWidth / 2) + j * (cardWidth + spacing.x);
      const y = sceneY + (cardHeight / 2) + i * (cardHeight + spacing.y);
      await placeCard(cards[index], {x, y});
    }
  }
}
