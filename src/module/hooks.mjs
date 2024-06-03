import * as apps from "./apps/_module.mjs";
import * as ccm_canvas from "./canvas/_module.mjs";
import CCM_CONFIG from "./config.mjs";
import {MODULE_ID} from "./helpers.mjs";
import {addCard, removeCard} from "./patches.mjs";

/**
 * Run on Foundry init
 */
export function init() {
  // TODO: Consider ASCII art
  console.log("Complete Card Management | Initializing");
  CONFIG.CCM = CCM_CONFIG;

  foundry.utils.mergeObject(CONFIG.Canvas, {
    layers: {
      cards: {
        group: "interface",
        layerClass: ccm_canvas.CardLayer
      }
    }
  });

  CONFIG.Card.objectClass = ccm_canvas.CardObject;
  CONFIG.Card.layerClass = ccm_canvas.CardLayer;
  CONFIG.Card.hudClass = apps.CardHud;

  DocumentSheetConfig.registerSheet(Cards, MODULE_ID, apps.CardsSheets.DeckSheet, {
    label: "CCM.Sheets.Deck", types: ["deck"]
  });
  DocumentSheetConfig.registerSheet(Cards, MODULE_ID, apps.CardsSheets.HandSheet, {
    label: "CCM.Sheets.Hand", types: ["hand"]
  });
  DocumentSheetConfig.registerSheet(Cards, MODULE_ID, apps.CardsSheets.PileSheet, {
    label: "CCM.Sheets.Pile", types: ["pile"]
  });
  DocumentSheetConfig.registerSheet(Card, MODULE_ID, apps.CardSheet, {
    label: "CCM.Sheets.Card"
  });

  const interfaceCls = CONFIG.Canvas.groups.interface.groupClass;
  interfaceCls.prototype.addCard = addCard;
  interfaceCls.prototype.removeCard = removeCard;

  Hooks.callAll("CCMInit");
}

/**
 * Run on Foundry ready
 */
export function ready() {
  console.log("Complete Card Management | Ready");
}

/****************
 * Canvas Hooks
 ****************/

/**
 * Handles drop data
 *
 * @param {Canvas} canvas                              - The Canvas
 * @param {import("./_types.mjs").CanvasDropData} data - Drop data
 */
export function dropCanvasData(canvas, data) {
  switch (data.type) {
    case "Card":
      handleCardDrop(canvas, data);
      break;
  }
}

/**
 *
 * @param {Canvas} canvas - The Game Canvas
 * @param {import("./_types.mjs").CanvasDropData} data - Drop data
 */
async function handleCardDrop(canvas, data) {
  /** @type {Card} */
  let card;
  try {
    card = fromUuidSync(data.uuid);
  }
  catch (e) {
    ui.notifications.error("The dropped card must already be in a card stack in the world");
    return;
  }
  const adjusted_x = data.x - (card.width * canvas.grid.sizeX) / 2;
  const adjusted_y = data.y - (card.height * canvas.grid.sizeY) / 2;

  await card.setFlag(MODULE_ID, canvas.scene.id, {x: adjusted_x, y: adjusted_y});

  const currentCards =
    canvas.scene.getFlag(MODULE_ID, "cardCollection") ?? [];

  currentCards.push(card.uuid);

  await canvas.scene.setFlag(MODULE_ID, "cardCollection", currentCards);
  await canvas.interface.draw();
}

/**
 * Hook event method for adding cards layer controls.
 * @param {SceneControl[]} controls
 */
export function getSceneControlButtons(controls) {
  controls.push({
    name: "cards",
    title: "CCM.CardLayer.Title",
    layer: "cards",
    icon: CONFIG.Cards.sidebarIcon,
    tools: [
      {
        name: "select",
        title: "CCM.CardLayer.Tools.SelectTitle",
        icon: "fa-solid fa-expand"
      }
    ],
    activeTool: "select"
  });
}

/**
 * A hook called when the canvas HUD is rendered during `Canvas#initialize`
 * @param {HeadsUpDisplay} app  - The HeadsUpDisplay application
 * @param {JQuery} jquery       - A JQuery object of the HUD
 * @param {object} context      - Context passed from HeadsUpDisplay#getData
 */
export function renderHeadsUpDisplay(app, [html], context) {
  if (!app.cards) app.cards = new CONFIG.Card.hudClass;
}
