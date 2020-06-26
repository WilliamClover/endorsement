"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class LinkedUsersSchema extends Schema {
  up() {
    this.create("linked_users", (table) => {
      table.increments();
      table.string("first_name");
      table.string("last_name");
      table.timestamps();
    });
  }

  down() {
    this.drop("linked_users");
  }
}

module.exports = LinkedUsersSchema;
