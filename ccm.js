import {hooks, canvas, apps} from "./src/module/_module.mjs";

globalThis.ccm = {canvas, apps};

Hooks.once("init", hooks.init);

Hooks.once("ready", hooks.ready);

Hooks.on("dropCanvasData", hooks.dropCanvasData);

Hooks.on("getSceneControlButtons", hooks.getSceneControlButtons);

Hooks.on("renderHeadsUpDisplay", hooks.renderHeadsUpDisplay);

Hooks.on("passCards", hooks.passCards);

Hooks.on("createCard", hooks.createCard);
Hooks.on("createCards", hooks.createCard);

Hooks.on("updateCard", hooks.updateCard);
Hooks.on("updateCards", hooks.updateCard);

Hooks.on("deleteCard", hooks.deleteCard);
Hooks.on("deleteCards", hooks.deleteCard);

Hooks.on("createScene", hooks.createScene);
