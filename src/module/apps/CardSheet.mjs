/**
 * @typedef {object} TabConfiguration
 * @property {string} id        The unique key for this tab.
 * @property {string} group     The group that this tab belongs to.
 * @property {string} label     The displayed label for this tab.
 */

const {HandlebarsApplicationMixin, DocumentSheetV2} = foundry.applications.api;

/**
 * AppV2 card sheet
 */
export default class CardSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["ccm", "card"],
    position: {
      width: 500,
      height: "auto"
    },
    actions: {
      addFace: this._onAddFace,
      deleteFace: this._onDeleteFace
    },
    form: {
      closeOnSubmit: true
    },
    window: {
      contentClasses: ["standard-form"],
      icon: "fa-solid fa-card-spade",
      contentTag: "div"
    }
  };

  /** @override */
  tabGroups = {
    primary: "details"
  };

  /**
   * Tabs that are present on this sheet.
   * @enum {TabConfiguration}
   */
  static TABS = {
    details: {id: "details", group: "primary", label: "CCM.CardSheet.TabDetails", icon: "fa-solid fa-pen-fancy"},
    faces: {id: "faces", group: "primary", label: "CCM.CardSheet.TabFaces", icon: "fa-solid fa-masks-theater"},
    back: {id: "back", group: "primary", label: "CCM.CardSheet.TabBack", icon: "fa-solid fa-mask"}
  };

  /** @override */
  static PARTS = {
    header: {template: "modules/complete-card-management/templates/card/header.hbs"},
    nav: {template: "modules/complete-card-management/templates/card/nav.hbs"},
    details: {template: "modules/complete-card-management/templates/card/details.hbs"},
    faces: {template: "modules/complete-card-management/templates/card/faces.hbs", scrollable: [""]},
    back: {template: "modules/complete-card-management/templates/card/back.hbs"},
    footer: {template: "modules/complete-card-management/templates/card/footer.hbs"}
  };

  /** @override */
  get title() {
    const stack = this.document.parent;
    if (!stack) return super.title;
    return game.i18n.format("CCM.CardSheet.CardParentTitle", {
      cardName: this.document.name,
      stackName: stack.name
    });
  }

  /** @override */
  _onRender(...T) {
    super._onRender(...T);
    this.#faces = this.element.querySelector("[name=face]");
    this.element.querySelectorAll(".faces legend input").forEach(n => {
      n.addEventListener("change", this._onChangeFaceName.bind(this));
    });
    this.element.querySelector("[name='back.name']").addEventListener("change", this._onChangeFaceName.bind(this));
  }

  /** @override */
  async _prepareContext(_options) {
    const context = {};
    const src = this.document.toObject();

    const makeField = (name, options = {}) => {
      const document = options.document ?? this.document;
      const schema = options.schema ?? document.schema;

      return {
        field: schema.getField(name),
        value: foundry.utils.getProperty(document, name),
        ...options
      };
    };

    // Header
    context.currentFace = this.document.faces[this.document.face]?.img || this.document.constructor.DEFAULT_ICON;
    context.name = makeField("name", {value: src.name, placeholder: game.i18n.localize("Name")});

    // Navigation
    context.tabs = Object.values(this.constructor.TABS).reduce((acc, v) => {
      const isActive = this.tabGroups[v.group] === v.id;
      acc[v.id] = {
        ...v,
        active: isActive,
        cssClass: isActive ? "item active" : "item",
        tabCssClass: isActive ? "tab scrollable active" : "tab scrollable"
      };
      return acc;
    }, {});

    // Details
    context.type = makeField("type", {choices: CONFIG.Card.typeLabels});
    context.suit = makeField("suit");
    context.value = makeField("value");
    context.width = makeField("width", {placeholder: game.i18n.localize("Width")});
    context.height = makeField("height", {placeholder: game.i18n.localize("Height")});
    context.rotation = makeField("rotation", {
      value: this.document.rotation || "",
      placeholder: game.i18n.localize("Rotation")
    });
    context.description = makeField("description", {
      enriched: await TextEditor.enrichHTML(this.document.description, {relativeTo: this.document})
    });

    // Faces
    context.face = makeField("face", {
      choices: {},
      blank: this.document.back.name || "CCM.CardSheet.BacksideUp"
    });
    context.faces = [];
    const fph = game.i18n.localize("CARD.FIELDS.faces.name.label");
    const schema = this.document.schema.getField("faces.element");
    for (const face of this.document.faces) {
      const idx = context.faces.length;
      const f = {
        name: makeField("name", {schema: schema, document: face, name: `faces.${idx}.name`, placeholder: fph}),
        img: makeField("img", {schema: schema, document: face, name: `faces.${idx}.img`}),
        text: makeField("text", {
          schema: schema,
          document: face,
          name: `faces.${idx}.text`,
          enriched: await TextEditor.enrichHTML(face.text, {relativeTo: this.document})
        })
      };
      context.face.choices[idx] = f.name.value || game.i18n.format("CCM.CardSheet.Unnamed", {idx: idx});
      context.faces.push(f);
    }

    // Back
    const back = this.document.schema.getField("back");
    const backDoc = this.document.back;
    context.backName = makeField("name", {schema: back, document: backDoc});
    context.backImg = makeField("img", {schema: back, document: backDoc, value: src.back.img});
    context.backText = makeField("text", {
      schema: back,
      document: backDoc,
      enriched: await TextEditor.enrichHTML(backDoc.text, {relativeTo: this.document})
    });

    return context;
  }

  /* ----------------------------- */
  /* Properties                    */
  /* ----------------------------- */

  /**
   * Convenient access to the contained Cards document
   * @type {Card} The card document this sheet represents
   */
  get card() {
    return this.document;
  }

  /**
   * Reference to the 'face' select.
   * @type {HTMLElement}
   */
  #faces = null;

  /* ----------------------------- */
  /* Event Handlers                */
  /* ----------------------------- */

  /**
   * Handle adding a new face.
   * @param {Event} event             Triggering click event.
   * @param {HTMLElement} target      The current target of the event.
   */
  static _onAddFace(event, target) {
    const formData = foundry.utils.expandObject(new FormDataExtended(this.element).object);
    formData.faces = Object.values(formData.faces ?? {}).concat([{name: "", img: "", text: ""}]);
    this.document.update(formData);
  }

  /**
   * Handle deleting a face.
   * @param {Event} event             Triggering click event.
   * @param {HTMLElement} target      The current target of the event.
   */
  static async _onDeleteFace(event, target) {
    const confirm = await foundry.applications.api.DialogV2.confirm({
      rejectClose: false,
      content: game.i18n.localize("CARD.ACTIONS.DeleteFace.Warning"),
      modal: true,
      window: {
        icon: "fa-solid fa-cards",
        title: "CARD.ACTIONS.DeleteFace.Title"
      }
    });
    if (!confirm) return;

    target.closest(".faces").remove();
    const formData = foundry.utils.expandObject(new FormDataExtended(this.element).object);
    formData.faces = Object.values(formData.faces ?? {});
    if (formData.face >= formData.faces.length) formData.face = 0;
    this.document.update(formData);
  }

  /**
   * Change the displayed label in the 'face' dropdown when changing
   * the name of a face in the 'faces' array or the back.
   * @param {Event} event     Initiating change event.
   */
  _onChangeFaceName(event) {
    // Changing the backside's name.
    if (event.currentTarget.name === "back.name") {
      const value = event.currentTarget.value || game.i18n.localize("CCM.CardSheet.BacksideUp");
      this.#faces.children[0].textContent = value;
    }

    // Changing a face's name.
    else {
      const idx = parseInt(event.currentTarget.closest("[data-idx]").dataset.idx);
      const value = event.currentTarget.value || game.i18n.format("CCM.CardSheet.Unnamed", {idx: idx});
      this.#faces.querySelector(`option[value="${idx}"]`).textContent = value;
    }
  }
}
