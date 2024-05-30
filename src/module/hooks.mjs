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
  const card = await fromUuid(data.uuid);
  const cardObject = new ccm_canvas.CardObjectModel({
    ...CONFIG.CCM.DEFAULTS.CardObject,
    x: data.x,
    y: data.y
  });
  await card.setFlag(MODULE_ID, canvas.scene.id, cardObject["_source"]);

  const currentCards =
    game.scenes.active.getFlag(MODULE_ID, "cardCollection") ?? [];

  currentCards.push(card.uuid);

  await game.scenes.active.setFlag(MODULE_ID, "cardCollection", currentCards);
  console.log("Updated", card.name);
}
