import * as apps from "./apps/_module.mjs";
import * as ccm_canvas from "./canvas/_module.mjs";
import CCM_CONFIG from "./config.mjs";
import {MODULE_ID, MoveCardType} from "./helpers.mjs";
import {addCard, removeCard} from "./patches.mjs";

/**
 * Run on Foundry init
 */
export function init() {
  // TODO: Consider ASCII art
  console.log("Complete Card Management | Initializing");
  CONFIG.CCM = CCM_CONFIG;

  // Avoiding risks related to dot notation by preferring manual assignment over mergeObject
  CONFIG.Canvas.layers.cards = {
    group: "interface",
    layerClass: ccm_canvas.CardLayer
  };
  CONFIG.Card.objectClass = ccm_canvas.CardObject;
  CONFIG.Card.layerClass = ccm_canvas.CardLayer;
  CONFIG.Card.hudClass = apps.CardHud;
  CONFIG.RegionBehavior.dataModels[MoveCardType] = ccm_canvas.MoveCardBehavior;
  CONFIG.RegionBehavior.typeIcons[MoveCardType] = "fa-solid fa-cards";
  CONFIG.controlIcons.flip = "modules/complete-card-management/assets/icons/vertical-flip.svg";
  CONFIG.controlIcons.rotate = "modules/complete-card-management/assets/icons/clockwise-rotation.svg";

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

  // Hook up new Cards methods.
  Cards.prototype.passDialog = apps.CardsDialogs.passDialog;
  Cards.prototype.dealDialog = apps.CardsDialogs.dealDialog;
  Cards.prototype.resetDialog = apps.CardsDialogs.resetDialog;
  Cards.prototype.playDialog = apps.CardsDialogs.playDialog;
  Cards.prototype.drawDialog = apps.CardsDialogs.drawDialog;

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

  await card.setFlag(MODULE_ID, canvas.scene.id, {x: adjusted_x, y: adjusted_y, rotation: card.rotation, sort: card.sort});

  const currentCards = new Set(canvas.scene.getFlag(MODULE_ID, "cardCollection")).add(card.uuid);

  await canvas.scene.setFlag(MODULE_ID, "cardCollection", Array.from(currentCards));
}

/**
 * A hook event that fires for every embedded Document type after conclusion of a creation workflow.
 * Substitute the Document name in the hook event to target a specific type, for example "createToken".
 * This hook fires for all connected clients after the creation has been processed.
 *
 * @event createDocument
 * @category Document
 * @param {Document} card                       The new Document instance which has been created
 * @param {Partial<DatabaseCreateOperation>} options Additional options which modified the creation request
 * @param {string} userId                           The ID of the User who triggered the creation workflow
 */
export async function createCard(card, options, userId) {
  if (card.getFlag(MODULE_ID, canvas.scene.id)) {
    const synthetic = new ccm_canvas.CanvasCard(card);
    card.canvasCard = synthetic;
    const obj = (synthetic._object = canvas.cards.createObject(synthetic));
    // canvas.cards.objects.addChild(obj);
    // await obj.draw();
    obj._onCreate(card.toObject(), options, userId); // does not currently do anything
  }
}

/**
 * A hook event that fires for every Document type after conclusion of an update workflow.
 * Substitute the Document name in the hook event to target a specific Document type, for example "updateActor".
 * This hook fires for all connected clients after the update has been processed.
 * @param {Card & { canvasCard?: ccm_canvas.CanvasCard}} card  The existing Document which was updated
 * @param {object} changed                                     Differential data that was used to update the document
 * @param {Partial<DatabaseUpdateOperation>} options           Additional options which modified the update request
 * @param {string} userId                                      The ID of the User who triggered the update workflow
 */
export async function updateCard(card, changed, options, userId) {
  const moduleFlags = foundry.utils.getProperty(changed, `flags.${MODULE_ID}`) ?? {};
  /** @type {ccm_canvas.CanvasCard} */
  let synthetic = card.canvasCard;
  if (synthetic && (synthetic.parent === canvas.scene)) { // A synthetic card exists & exists on the canvas
    synthetic.update(changed, options, userId);
  }
  else if (canvas.scene.id in moduleFlags) { // New cards
    const synthetic = new ccm_canvas.CanvasCard(card);
    card.canvasCard = synthetic;
    const obj = (synthetic._object = canvas.cards.createObject(synthetic));
    // canvas.cards.objects.addChild(obj);
    // await obj.draw();
    obj._onCreate(card.toObject(), options, userId);
    synthetic._checkRegionTrigger(moduleFlags[canvas.scene.id], userId, true);
  }
}

/**
 * A hook event that fires for every Document type after conclusion of an deletion workflow.
 * Substitute the Document name in the hook event to target a specific Document type, for example "deleteActor".
 * This hook fires for all connected clients after the deletion has been processed.
 *
 * @event deleteDocument
 * @category Document
 * @param {Document} card                       The existing Document which was deleted
 * @param {Partial<DatabaseDeleteOperation>} options Additional options which modified the deletion request
 * @param {string} userId                           The ID of the User who triggered the deletion workflow
 */
export async function deleteCard(card, options, userId) {
  if (card.canvasCard) {
    card.canvasCard.object._onDelete(options, userId);
  }
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
      },
      {
        name: "snap",
        title: "CONTROLS.CommonForceSnap",
        icon: "fa-solid fa-plus",
        toggle: true,
        active: canvas.forceSnapVertices,
        onClick: toggled => canvas.forceSnapVertices = toggled
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
  // Position the CardHUD within the appropriate HTML
  const cardHudTemplate = document.createElement("template");
  cardHudTemplate.setAttribute("id", "card-hud");
  html.appendChild(cardHudTemplate);
}
