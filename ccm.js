import * as hooksACS from './src/module/hooks.mjs';

Hooks.once('init', hooksACS.init);

Hooks.once('ready', hooksACS.ready);

Hooks.once('dropCanvasData', hooksACS.dropCanvasData);
