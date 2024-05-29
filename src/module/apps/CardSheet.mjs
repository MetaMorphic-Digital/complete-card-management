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
      icon: "fa-solid fa-cards",
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
    context.type = makeField("type", {choices: CONFIG.Card.typeLabels, label: "CARD.Type"});
    context.suit = makeField("suit");
    context.value = makeField("value");
    context.width = makeField("width", {placeholder: game.i18n.localize("Width")});
    context.height = makeField("height", {placeholder: game.i18n.localize("Height")});
    context.rotation = makeField("rotation", {value: this.document.rotation || null, placeholder: game.i18n.localize("Rotation")});
    context.description = makeField("description", {
      enriched: await TextEditor.enrichHTML(this.document.description, {relativeTo: this.document})
    });

    // Faces
    context.face = makeField("face", {placeholder: game.i18n.localize("CCM.CardSheet.BacksideUp")});
    context.faces = [];

    const fph = game.i18n.localize("CCM.CardSheet.FaceName");
    const schema = this.document.schema.getField("faces.element");
    for (const face of this.document.faces) {
      const idx = context.faces.length;
      context.faces.push({
        name: makeField("name", {schema: schema, document: face, name: `faces.${idx}.name`, placeholder: fph}),
        img: makeField("img", {schema: schema, document: face, name: `faces.${idx}.img`}),
        text: makeField("text", {
          schema: schema,
          document: face,
          name: `faces.${idx}.text`,
          enriched: await TextEditor.enrichHTML(face.text, {relativeTo: this.document})
        })
      });
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

  /* ----------------------------- */
  /* Event Handlers                */
  /* ----------------------------- */

  /**
   * Handle adding a new face.
   * @param {Event} event             Triggering click event.
   * @param {HTMLElement} target      The current target of the event.
   */
  static _onAddFace(event, target) {
    const faces = this.document.toObject().faces.concat([{name: "", img: "", text: ""}]);
    this.document.update({faces});
  }

  /**
   * Handle deleting a face.
   * @param {Event} event             Triggering click event.
   * @param {HTMLElement} target      The current target of the event.
   */
  static _onDeleteFace(event, target) {
    const idx = parseInt(target.closest("[data-idx]").dataset.idx);
    const faces = this.document.toObject().faces;
    faces.splice(idx, 1);
    this.document.update({faces});
  }
}
