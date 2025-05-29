import {hooks, canvas, api, apps, CCMSocketHandler} from "./src/module/_module.mjs";

globalThis.ccm = {canvas, api, apps, socket: new CCMSocketHandler()};

Hooks.once("init", hooks.init);

Hooks.once("ready", hooks.ready);

Hooks.on("dropCanvasData", hooks.dropCanvasData);

Hooks.on("renderSceneConfig", hooks.renderSceneConfig);

Hooks.on("renderHeadsUpDisplayContainer", hooks.renderHeadsUpDisplayContainer);
Hooks.on("renderUserConfig", hooks.renderUserConfig);
Hooks.on("renderPlayers", hooks.renderPlayers);
Hooks.on("getUserContextOptions", hooks.getUserContextOptions);
Hooks.on("updateUser", hooks.updateUser);

Hooks.on("passCards", hooks.passCards);

Hooks.on("createCard", hooks.createCard);
Hooks.on("createCards", hooks.createCard);

Hooks.on("updateCard", hooks.updateCard);
Hooks.on("updateCards", hooks.updateCard);

Hooks.on("deleteCard", hooks.deleteCard);
Hooks.on("deleteCards", hooks.deleteCard);

Hooks.on("createScene", hooks.createScene);

Hooks.on("getCardsContextOptions", hooks.addCardsDirectoryOptions);
