/* eslint-disable jsdoc/no-undefined-types */
import * as apps from './apps/_module.mjs';
import * as canvas from './canvas/_module.mjs';
import ACS_CONFIG from './config.mjs';
import { MODULE_ID } from './helpers.mjs';
import { addCard, removeCard } from './patches.mjs';

/**
 * Run on Foundry init
 */
export function init() {
  // TODO: Consider ASCII art
  console.log('Initializing ACS');
  CONFIG.ACS = ACS_CONFIG;

  foundry.utils.mergeObject(CONFIG.Canvas, {
    layers: {
      cards: {
        group: 'interface',
        layerClass: canvas.CardLayer,
      },
    },
  });

  CONFIG.Card.objectClass = canvas.CardObject;
  CONFIG.Card.layerClass = canvas.CardLayer;
  CONFIG.Card.hudClass = apps.CardHud;

  DocumentSheetConfig.registerSheet(Cards, MODULE_ID, apps.CardsSheet, {
    label: 'CCM.Sheet.Cards',
  });
  DocumentSheetConfig.registerSheet(Card, MODULE_ID, apps.CardSheet, {
    label: 'CCM.Sheet.Card',
  });

  const interfaceCls = CONFIG.Canvas.groups.interface.groupClass;
  interfaceCls.prototype.addCard = addCard;
  interfaceCls.prototype.removeCard = removeCard;

  Hooks.callAll('ACSInit');
}

/**
 * Run on Foundry ready
 */
export function ready() {
  console.log('ACS Ready');
}

/**
 * Handles drop data
 *
 * @param {Canvas} canvas                              - The Canvas
 * @param {import("./_types.mjs").CanvasDropData} data - Drop data
 */
export function dropCanvasData(canvas, data) {
  switch (data.type) {
    case 'Card':
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
  /** @type {import('./_types.mjs').CardObjectModelData} */
  const objectData = {
    alpha: 1,
    elevation: 0,
    height: 300,
    width: 200,
    rotation: 0,
    sort: 0,
    x: data.x,
    y: data.y,
  };
  await card.setFlag(MODULE_ID, canvas.scene.id, objectData);

  const currentCards =
    game.scenes.active.getFlag(MODULE_ID, 'cardCollection') ?? [];

  currentCards.push(card.uuid);

  await game.scenes.active.setFlag(MODULE_ID, 'cardCollection', currentCards);
  console.log('Updated', card.name);
}
