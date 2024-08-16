import {MODULE_ID} from "../helpers.mjs";

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
 * @param {number} [options.sceneId]            Scene ID to play cards to. Defaults to canvas.scene
 * @returns {Promise<Card[]>}                   A promise that resolves to the drawn cards.
 */
export async function grid(config, options = {}) {
  const scene = options.sceneId ? game.scenes.get(options.sceneId) : canvas.scene;

  if (!scene) {
    if (!options.sceneId) throw new Error("Not viewing a scene to place cards.");
    else throw new Error(`Could not find scene with ID '${options.sceneId}.`);
  }
  if (config.from.type !== "deck") {
    throw new Error("You can only create a grid from a deck");
  }
  if (!scene.canUserModify(game.user, "update")) {
    throw new Error("Placing a card requires updating the scene");
  }

  const {sceneHeight, sceneWidth, sceneX, sceneY} = scene.dimensions;
  const cardWidth = scene.grid.sizeX * (options.defaultWidth ?? 2);
  const cardHeight = scene.grid.sizeY * (options.defaultHeight ?? 3);
  const spacing = {
    x: options.horizontalSpacing ?? scene.grid.sizeX,
    y: options.verticalSpacing ?? scene.grid.sizeY
  };

  // Only need spacing between cards, not either end, so 1 less than # cards
  const totalHeight = config.rows * (spacing.y + cardHeight) - spacing.y;
  const totalWidth = config.columns * (spacing.x + cardWidth) - spacing.x;

  if ((totalWidth > sceneWidth) || (totalHeight > sceneHeight)) {
    throw new Error("Not enough room on scene to place cards");
  }

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
            [scene.id]: {
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
  const currentCards = new Set(scene.getFlag(MODULE_ID, "cardCollection")).union(
    new Set(cards.map((card) => card.uuid))
  );
  await scene.setFlag(MODULE_ID, "cardCollection", Array.from(currentCards));
  if (options.sceneId) ui.notifications.info(game.i18n.format("CCM.API.LayoutScene", {name: scene.name}));
  return cards;
}

/**
 * Creates a pyramid of placed cards
 * @param {object} config                       Mandatory configuration object
 * @param {Cards} config.from                   The Cards document to draw from
 * @param {Cards} config.to                     The Cards document to put the cards into
 * @param {number} config.base                  Number of cards per side
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
 * @param {"UP" | "DOWN" | "LEFT" | "RIGHT"} [options.direction] Direction to orient the pyramid
 * @param {number} [options.sceneId]            Scene ID to play cards to. Defaults to canvas.scene
 * @returns {Promise<Card[]>}                   A promise that resolves to the drawn cards.
 */
export async function triangle(config, options = {}) {
  const scene = options.sceneId ? game.scenes.get(options.sceneId) : canvas.scene;

  if (!scene) {
    if (!options.sceneId) throw new Error("Not viewing a scene to place cards");
    else throw new Error("Could not find scene with ID" + options.sceneId);
  }
  if (config.from.type !== "deck") {
    throw new Error("You can only create a grid from a deck");
  }
  if (!scene.canUserModify(game.user, "update")) {
    throw new Error("Placing a card requires updating the scene");
  }

  const {sceneHeight, sceneWidth, sceneX, sceneY} = scene.dimensions;
  console.log(sceneHeight, sceneWidth, sceneX, sceneY);
  const cardWidth = scene.grid.sizeX * (options.defaultWidth ?? 2);
  const cardHeight = scene.grid.sizeY * (options.defaultHeight ?? 3);
  const spacing = {
    x: options.horizontalSpacing ?? scene.grid.sizeX,
    y: options.verticalSpacing ?? scene.grid.sizeY
  };
  const direction = options.direction ?? "UP";
  const direction_x = direction === "LEFT" ? -1 : 1;
  const direction_y = direction === "UP" ? -1 : 1;
  const isVertical = ["UP", "DOWN"].includes(direction);

  // Only need spacing between cards, not either end, so 1 less than # cards
  const totalHeight = config.base * (spacing.y + cardHeight) - spacing.y;
  const totalWidth = config.base * (spacing.x + cardWidth) - spacing.x;

  if ((totalWidth > sceneWidth) || (totalHeight > sceneHeight)) {
    throw new Error("Not enough room on scene to place cards");
  }

  const drawCount = (config.base * (config.base + 1)) / 2;
  const cards = await config.to.draw(config.from, drawCount, {
    how: options.how,
    updateData: options.updateData ?? {}
  });

  const updateData = [];

  for (let i = 0; i < config.base; i++) {
    let offsetX = sceneX + (options.offsetX ?? 0);
    let offsetY = sceneY + (options.offsetY ?? 0);
    switch (direction) {
      case "DOWN":
        offsetX += (spacing.x + cardWidth) * 0.5 * i;
        break;
      case "UP":
        offsetX += (spacing.x + cardWidth) * 0.5 * i;
        offsetY += totalHeight - cardHeight;
        break;
      case "RIGHT":
        offsetY += (spacing.y + cardHeight) * 0.5 * i;
        break;
      case "LEFT":
        offsetY += (spacing.y + cardHeight) * 0.5 * i;
        offsetX += totalWidth - cardWidth;
        break;
    }
    for (let j = 0; j < (config.base - i); j++) {
      const index = i * config.base + j - ((i * (i - 1)) / 2);
      const loop_x = isVertical ? j : i;
      const loop_y = isVertical ? i : j;
      const card = cards[index];
      const cardUpdate = {
        _id: card._id,
        flags: {
          [MODULE_ID]: {
            [scene.id]: {
              x: offsetX + loop_x * (cardWidth + spacing.x) * direction_x,
              y: offsetY + loop_y * (cardHeight + spacing.y) * direction_y,
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
  const currentCards = new Set(scene.getFlag(MODULE_ID, "cardCollection")).union(
    new Set(cards.map((card) => card.uuid))
  );
  await scene.setFlag(MODULE_ID, "cardCollection", Array.from(currentCards));
  if (options.sceneId) ui.notifications.info(game.i18n.format("CCM.API.LayoutScene", {name: scene.name}));
  return cards;
}
