/**
 * Display a dialog which prompts the user to pass cards from this document to some other Cards document.
 * @returns {Promise<Cards|null>}
 */
export async function passDialog() {
  const cards = game.cards.reduce((acc, c) => {
    const valid = (c !== this) && (c.type !== "deck") && c.testUserPermission(game.user, "LIMITED");
    if (valid) acc[c.id] = c.name;
    return acc;
  }, {});

  if (foundry.utils.isEmpty(cards)) {
    ui.notifications.warn("CARDS.PassWarnNoTargets", {localize: true});
    return null;
  }

  if (!this.cards.size) {
    ui.notifications.warn(game.i18n.format("CCM.Warning.NoCardsAvailable", {
      type: game.i18n.localize(CONFIG.Cards.typeLabels[this.type])
    }));
    return null;
  }

  const to = new foundry.data.fields.StringField({
    label: "CARDS.PassTo",
    choices: cards
  });

  const number = new foundry.data.fields.NumberField({
    label: "CARDS.Number",
    min: 1,
    max: this.cards.size,
    step: 1
  });

  const how = new foundry.data.fields.NumberField({
    label: "CARDS.DrawMode",
    choices: {
      [CONST.CARD_DRAW_MODES.TOP]: "CARDS.DrawModeTop",
      [CONST.CARD_DRAW_MODES.BOTTOM]: "CARDS.DrawModeBottom",
      [CONST.CARD_DRAW_MODES.RANDOM]: "CARDS.DrawModeRandom"
    }
  });

  const down = new foundry.data.fields.BooleanField({
    label: "CARDS.Facedown"
  });

  // Construct the dialog HTML
  const html = await renderTemplate("modules/complete-card-management/templates/card/dialog-pass.hbs", {
    to: to, number: number, how: how, down: down
  });

  // Display the prompt
  return foundry.applications.api.DialogV2.prompt({
    content: html,
    classes: ["ccm", "dialog", "pass"],
    window: {
      title: "CARDS.PassTitle",
      icon: "fa-solid fa-cards"
    },
    position: {
      width: 400,
      height: "auto"
    },
    ok: {
      label: "CARDS.Pass",
      callback: (event, button, html) => {
        const form = html.querySelector("form");
        const fd = new FormDataExtended(form).object;
        const to = game.cards.get(fd.to);
        const options = {action: "pass", how: fd.how, updateData: fd.down ? {face: null} : {}};
        return this.deal([to], fd.number, options).catch(err => {
          ui.notifications.error(err.message);
          return this;
        });
      }
    },
    rejectClose: false,
    modal: true
  });
}

/**
 * Display a dialog which prompts the user to deal cards to some number of hand-type Cards documents.
 * @returns {Promise<Cards|null>}
 */
export async function dealDialog() {
  const cards = game.cards.filter(c => {
    return (c.type !== "deck") && c.testUserPermission(game.user, "LIMITED");
  });

  if (foundry.utils.isEmpty(cards)) {
    ui.notifications.warn("CARDS.DealWarnNoTargets", {localize: true});
    return null;
  }

  const dealable = this.cards.reduce((acc, c) => acc + (c.drawn ? 0 : 1), 0);

  if (!dealable) {
    ui.notifications.warn(game.i18n.format("CCM.Warning.NoCardsAvailable", {
      type: game.i18n.localize(CONFIG.Cards.typeLabels[this.type])
    }));
    return null;
  }

  const number = new foundry.data.fields.NumberField({
    label: "CARDS.Number",
    min: 1,
    max: dealable,
    step: 1
  });

  const how = new foundry.data.fields.NumberField({
    label: "CARDS.DrawMode",
    choices: {
      [CONST.CARD_DRAW_MODES.TOP]: "CARDS.DrawModeTop",
      [CONST.CARD_DRAW_MODES.BOTTOM]: "CARDS.DrawModeBottom",
      [CONST.CARD_DRAW_MODES.RANDOM]: "CARDS.DrawModeRandom"
    }
  });

  const down = new foundry.data.fields.BooleanField({
    label: "CARDS.Facedown"
  });

  // Construct the dialog HTML
  const html = await renderTemplate("modules/complete-card-management/templates/card/dialog-deal.hbs", {
    cards: cards, number: number, how: how, down: down
  });

  // Display the prompt
  return foundry.applications.api.DialogV2.prompt({
    content: html,
    classes: ["ccm", "dialog", "deal"],
    window: {
      title: "CARDS.DealTitle",
      icon: "fa-solid fa-cards"
    },
    position: {
      width: 400,
      height: "auto"
    },
    ok: {
      label: "CARDS.Deal",
      callback: (event, button, html) => {
        const form = html.querySelector("form");
        const fd = new FormDataExtended(form).object;
        if (!fd.to) return this;
        const toIds = fd.to instanceof Array ? fd.to : [fd.to];
        const to = toIds.reduce((arr, id) => {
          const c = game.cards.get(id);
          if (c) arr.push(c);
          return arr;
        }, []);
        const options = {how: fd.how, updateData: fd.down ? {face: null} : {}};
        return this.deal(to, fd.number, options).catch(err => {
          ui.notifications.error(err.message);
          return this;
        });
      }
    },
    rejectClose: false,
    modal: true
  });
}

// todo: reset, play, draw dialogs.
