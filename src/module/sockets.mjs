export default class CCMSocketHandler {
  constructor() {
    /**
     * Identifier used for socket operations
     * @type {string}
     */
    this.identifier = "module.complete-card-management";
  }

  /**
   * Sets up socket reception
   */
  registerSocketHandlers() {
    game.socket.on(this.identifier, ({type, payload}) => {
      switch (type) {
        default:
          throw new Error("Unknown type");
      }
    });
  }

  /**
   * Emits a socket message to all other connected clients
   * @param {string} type
   * @param {object} payload
   */
  emit(type, payload) {
    return game.socket.emit(this.identifier, {type, payload});
  }
}
