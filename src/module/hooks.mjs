import * as api from "./api/_module.mjs";
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

  ccm.socket.registerSocketHandlers();

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
  CONFIG.controlIcons.shuffle = "modules/complete-card-management/assets/icons/shuffle.svg";

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

/* -------------------------------------------------- */

/**
 * Run on Foundry ready
 */
export function ready() {
  console.log("Complete Card Management | Ready");
}

/* -------------------------------------------------- */
/*   Canvas hooks                                     */
/* -------------------------------------------------- */

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
    case "Cards":
      handleCardStackDrop(canvas, data);
      break;
  }
}

/* -------------------------------------------------- */

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

  api.placeCard(card, data);
}

/* -------------------------------------------------- */

/**
 *
 * @param {Canvas} canvas - The Game Canvas
 * @param {import("./_types.mjs").CanvasDropData} data - Drop data
 */
async function handleCardStackDrop(canvas, data) {
  let cards = await fromUuidSync(data.uuid);
  if (cards.pack) {
    // We can import Cards documents from compendiums because they're primary documents
    const CardsCls = getDocumentClass("Cards");
    cards = await CardsCls.create(cards);
  }

  api.placeCard(cards, data);
}

/* -------------------------------------------------- */

/**
 * A hook event that fires when Cards are passed from one stack to another.
 * @event passCards
 * @category Cards
 * @param {Cards} origin                The origin Cards document
 * @param {Cards} destination           The destination Cards document
 * @param {object} context              Additional context which describes the operation
 * @param {string} context.action       The action name being performed, i.e. "pass", "play", "discard", "draw"
 * @param {object[]} context.toCreate     Card creation operations to be performed in the destination Cards document
 * @param {object[]} context.toUpdate     Card update operations to be performed in the destination Cards document
 * @param {object[]} context.fromUpdate   Card update operations to be performed in the origin Cards document
 * @param {object[]} context.fromDelete   Card deletion operations to be performed in the origin Cards document
 */
export function passCards(origin, destination, context) {
  const cardCollectionRemovals = new Set(context.fromDelete.map(id => origin.cards.get(id).uuid));
  for (const changes of context.fromUpdate) { // origin type is a deck
    const card = origin.cards.get(changes._id);
    const moduleFlags = foundry.utils.getProperty(card, `flags.${MODULE_ID}`) ?? {};
    for (const sceneId of Object.keys(moduleFlags)) {
      foundry.utils.setProperty(changes, `flags.${MODULE_ID}.-=${sceneId}`, null);
    }
    cardCollectionRemovals.add(card.uuid);
  }
  const canUpdateScene = canvas.scene.canUserModify(game.user, "update");
  if (canUpdateScene) {
    const cardCollection = new Set(canvas.scene.getFlag(MODULE_ID, "cardCollection"));
    for (const uuid of cardCollection) {
      if (!cardCollectionRemovals.has(uuid)) continue;
      cardCollection.delete(uuid);
      cardCollection.add(uuid.replace(origin.id, destination.id));
      canvas.scene.setFlag(MODULE_ID, "cardCollection", Array.from(cardCollection));
    }
  }
  else ccm.socket.emit("passCardHandler",
    {cardCollectionRemovals: Array.from(cardCollectionRemovals), originId: origin.id, destinationId: destination.id}
  );
}

/* -------------------------------------------------- */

/**
 * A hook event that fires for every embedded Document type after conclusion of a creation workflow.
 * Substitute the Document name in the hook event to target a specific type, for example "createToken".
 * This hook fires for all connected clients after the creation has been processed.
 *
 * @event createDocument
 * @category Document
 * @param {Card | Cards} card                       The new Document instance which has been created
 * @param {Partial<DatabaseCreateOperation>} options Additional options which modified the creation request
 * @param {string} userId                           The ID of the User who triggered the creation workflow
 */
export async function createCard(card, options, userId) {
  if (card.getFlag(MODULE_ID, canvas.scene.id)) {
    const synthetic = new ccm_canvas.CanvasCard(card);
    card.canvasCard = synthetic;
    const obj = (synthetic._object = canvas.cards.createObject(synthetic));
    obj._onCreate(card.toObject(), options, userId);
  }
}

/* -------------------------------------------------- */

/**
 * A hook event that fires for every Document type after conclusion of an update workflow.
 * Substitute the Document name in the hook event to target a specific Document type, for example "updateActor".
 * This hook fires for all connected clients after the update has been processed.
 * @param {(Card | Cards) & { canvasCard?: ccm_canvas.CanvasCard}} card  The existing Document which was updated
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
    if ((card.documentName === "Card") && card.parent && card.parent.canvasCard) {
      card.parent.canvasCard.refreshFace();
    }
  }
  else if (canvas.scene.id in moduleFlags) { // New cards
    if (card.drawn && card.isHome) {
      ui.notifications.error("CCM.Warning.CardDrawn", {localize: true});
      return;
    }
    const synthetic = new ccm_canvas.CanvasCard(card);
    card.canvasCard = synthetic;
    const obj = (synthetic._object = canvas.cards.createObject(synthetic));
    obj._onCreate(card.toObject(), options, userId);
    if (card.documentName === "Card") {
      if (card.parent && card.parent.canvasCard) card.parent.canvasCard.refreshFace();
      synthetic._checkRegionTrigger(moduleFlags[canvas.scene.id], userId, true);
    }
  }
}

/* -------------------------------------------------- */

/**
 * A hook event that fires for every Document type after conclusion of an deletion workflow.
 * Substitute the Document name in the hook event to target a specific Document type, for example "deleteActor".
 * This hook fires for all connected clients after the deletion has been processed.
 *
 * @event deleteDocument
 * @category Document
 * @param {Card | Cards} card                       The existing Document which was deleted
 * @param {Partial<DatabaseDeleteOperation>} options Additional options which modified the deletion request
 * @param {string} userId                           The ID of the User who triggered the deletion workflow
 */
export async function deleteCard(card, options, userId) {
  if (card.canvasCard) {
    card.canvasCard.object._onDelete(options, userId);
  }
}

/* -------------------------------------------------- */

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
      },
      {
        name: "delete",
        title: "CCM.CardLayer.Tools.ClearTitle",
        icon: "fa-solid fa-trash",
        visible: game.user.isGM,
        button: true,
        onClick: () => canvas.cards.deleteAll()
      }
    ],
    activeTool: "select"
  });
}

/* -------------------------------------------------- */

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

/* -------------------------------------------------- */

/**
 * A hook event that fires for every embedded Document type after conclusion of a creation workflow.
 * Substitute the Document name in the hook event to target a specific type, for example "createToken".
 * This hook fires for all connected clients after the creation has been processed.
 *
 * @event createDocument
 * @category Document
 * @param {Scene} scene                       The new Document instance which has been created
 * @param {Partial<DatabaseCreateOperation>} options Additional options which modified the creation request
 * @param {string} userId                           The ID of the User who triggered the creation workflow
 */
export async function createScene(scene, options, userId) {
  if (userId !== game.userId) return; // guaranteed to be GM level user
  const cardCollection = scene.getFlag(MODULE_ID, "cardCollection");
  const sourceScene = fromUuidSync(scene._stats.duplicateSource);
  if (!cardCollection || !sourceScene || !(sourceScene instanceof Scene) || sourceScene.pack) return;
  const cardStackUpdates = [];
  const cardUpdates = cardCollection.reduce((cards, uuid) => {
    const d = fromUuidSync(uuid);
    if (!d) return cards;
    const updateData = {
      flags: {
        [MODULE_ID]: {
          [scene.id]: d.getFlag(MODULE_ID, sourceScene.id)
        }
      },
      _id: d.id
    };
    if (d instanceof Cards) cardStackUpdates.push(updateData);
    else {
      const parentSlot = cards[d.parent.id];
      if (parentSlot) parentSlot.push(updateData);
      else cards[d.parent.id] = [updateData];
    }
    return cards;
  }, {});

  await Cards.implementation.updateDocuments(cardStackUpdates);

  for (const [id, updates] of Object.entries(cardUpdates)) {
    await game.cards.get(id).updateEmbeddedDocuments("Card", updates);
  }
}

/* -------------------------------------------------- */

/**
 * Add additional context options to cards in cards directory.
 * @param {HTMLElement} html      The sidebar html.
 * @param {object[]} options      The array of context menu options.
 */
export function addCardsDirectoryOptions(html, options) {
  options.push({
    name: "CCM.CardSheet.ScryingContext",
    icon: "<i class='fa-solid fa-eye'></i>",
    callback: async ([li]) => {
      const id = li.dataset.documentId;
      const cards = game.cards.get(id);
      const data = await promptAmount(cards);
      if (!data) return;
      ccm.api.scry(cards, {amount: data.amount, how: data.mode});
    }
  });
}

/* -------------------------------------------------- */

/**
 * Create a prompt for the user to select how many cards they want to have revealed, and how.
 * @param {Cards} cards                     The deck, hand, or pile of cards.
 * @returns {Promise<object|null|void>}     A promise that resolves to the number of cards and how to draw.
 */
async function promptAmount(cards) {
  const max = (cards.type === "deck") ? cards.availableCards.length : cards.cards.size;
  if (!max) {
    ui.notifications.warn(game.i18n.format("CCM.Warning.NoCardsAvailable", {
      type: game.i18n.localize(CONFIG.Cards.typeLabels[cards.type])
    }));
    return;
  }

  const rangePicker = new foundry.data.fields.NumberField({
    label: "CCM.CardSheet.ScryPromptLabel",
    hint: "CCM.CardSheet.ScryPromptHint"
  }).toFormGroup({localize: true}, {
    value: 1, step: 1, min: 1, max: max, name: "amount"
  }).outerHTML;

  const drawMode = new foundry.data.fields.NumberField({
    label: "CARDS.DrawMode",
    choices: {
      [CONST.CARD_DRAW_MODES.TOP]: "CARDS.DrawModeTop",
      [CONST.CARD_DRAW_MODES.BOTTOM]: "CARDS.DrawModeBottom"
    }
  }).toFormGroup({localize: true}, {
    value: CONST.CARD_DRAW_MODES.TOP, blank: false, name: "mode", localize: true
  }).outerHTML;

  const title = game.i18n.format("CCM.CardSheet.ScryingTitle", {name: cards.name});

  const data = await foundry.applications.api.DialogV2.prompt({
    modal: true,
    rejectClose: false,
    content: `<fieldset>${rangePicker}${drawMode}</fieldset>`,
    window: {title: title, icon: "fa-solid fa-eye"},
    position: {width: 400},
    ok: {
      callback: (event, button, html) => {
        const {amount, mode} = new FormDataExtended(button.form).object;
        return {amount, mode};
      }
    }
  });
  return data;
}
