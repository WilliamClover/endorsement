"use strict";
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

class Authenticated {
  /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
  async handle({ request, auth, response }, next) {
    try {
      await auth.check();
      if (auth.user.is_admin == 1) {
        await next();
      } else {
        return response.route("home");
      }
    } catch (error) {
      return response.route("login");
    }
  }
}

module.exports = Authenticated;
