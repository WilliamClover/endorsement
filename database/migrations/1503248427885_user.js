"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class UserSchema extends Schema {
  up() {
    this.create("users", (table) => {
      table.increments();
      table.boolean("is_canceled").defaultTo(0);
      table.string("firstname", 254).notNullable();
      table.string("lastname", 254).notNullable();
      table.string("email", 254).notNullable();
      table.string("phonenumber", 254).notNullable();
      table.string("password", 60).notNullable();
      table.string("confirmation_token");
      table.integer("linked_user_id");
      table.string("secret_totp");
      table.boolean("is_admin").defaultTo(0);
      table.boolean("accstatus").defaultTo(0);
      table.timestamps();
    });
  }

  down() {
    this.drop("users");
  }
}

module.exports = UserSchema;
