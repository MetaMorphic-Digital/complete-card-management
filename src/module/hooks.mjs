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

  DocumentSheetConfig.registerSheet(Cards, MODULE_ID, apps.CardsSheet, {
    label: "CCM.Sheets.Cards"
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
    card = fromUuidSync(data.uuid)
  }
  catch (e) {
    ui.notifications.error("The dropped card must already be in a card stack in the world")
  }

  await card.setFlag(MODULE_ID, canvas.scene.id, { x: data.x, y: data.y });

  const currentCards =
    game.scenes.active.getFlag(MODULE_ID, "cardCollection") ?? [];

  currentCards.push(card.uuid);

  await game.scenes.active.setFlag(MODULE_ID, "cardCollection", currentCards);
  console.log("Updated", card.name);
}

/**
 *
 * @param {SceneControl[]} controls
 */
export function getSceneControlButtons(controls) {
  controls.push({
    name: 'cards',
    title: 'CCM.CardLayer.Title',
    layer: 'cards',
    icon: CONFIG.Cards.sidebarIcon,
    tools: [
      {
        name: "select",
        title: 'CCM.CardLayer.Tools.SelectTitle',
        icon: "fa-solid fa-expand"
      }
    ],
    activeTool: 'select'
  })
}