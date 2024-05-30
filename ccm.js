import {hooks, canvas, apps} from "./src/module/_module.mjs";

globalThis.ccm = {canvas, apps};

Hooks.once("init", hooks.init);

Hooks.once("ready", hooks.ready);

Hooks.once("dropCanvasData", hooks.dropCanvasData);

Hooks.on('getSceneControlButtons', hooks.getSceneControlButtons)