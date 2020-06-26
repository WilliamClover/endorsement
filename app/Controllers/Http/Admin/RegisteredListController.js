"use strict";
const User = use("App/Models/User");
const Database = use("Database");
const Mail = use("Mail");
const sgMail = use("@sendgrid/mail");
const Env = use("Env");

class RegisteredListController {
  async showUsersList({ view }) {
    const linkedUsers = await Database.table("policies")
      .distinct("contact")
      .distinct("contactid");
    const users = await Database.from("users")
      .orderBy("is_canceled")
      .whereNot({ is_admin: 1 });
    return view.render("admin.usersList", {
      users: users,
      linkedUsers: linkedUsers,
    });
  }

  async activateUser({ request, response }) {
    const accountToActivate = await User.query()
      .where("email", request.input("email"))
      .first();
    if (!accountToActivate) {
      session.flash({
        alert: {
          type: "error",
          message: "This account does not exist",
        },
      });
    } else {
      accountToActivate.accstatus = 1;
      await accountToActivate.save();
      // send confirmation emailg

      sgMail.setApiKey(Env.get("SENDGRID_API_KEY"));
      const msg = {
        //to: request.input("email"),
        to: "williamelturk@gmail.com",
        from: "w3lb.com@gmail.com",
        subject: "You Clover account is activated",
        html: "<strong>You Clover account is activated</strong>",
      };
      sgMail
        .send(msg)
        .then(() => {
          const flashMessage = "Message Sent to the activated account";
        })
        .catch((error) => {
          const flashMessage = error.response.body;
          console.log("RegisteredListController", error.response.body);
        });
      return response.redirect("/admin/registered");
    }
  }

  async deleteUser({ request, response }) {
    const accountToDelete = await User.query()
      .where("email", request.input("email"))
      .first();
    if (!accountToDelete) {
      session.flash({
        alert: {
          type: "error",
          message: "This account does not exist",
        },
      });
    } else {
      accountToDelete.accstatus = 0;
      accountToDelete.is_canceled = 1;
      accountToDelete.linked_user_id = 0;
      await accountToDelete.save();
    }
    return response.redirect("back");
  }

  async linkUser({ request, response }) {
    const accountToLink = await User.query()
      .where("id", request.input("registeredUserId"))
      .first();
    accountToLink.linked_user_id = request.input("linkedUserId");
    await accountToLink.save();

    return response.redirect("back");
  }

  async unlinkUser({ request, response }) {
    const accountToUnlink = await User.query()
      .where("email", request.input("email"))
      .first();
    if (!accountToUnlink) {
      session.flash({
        alert: {
          type: "error",
          message: "This account does not exist",
        },
      });
    } else {
      accountToUnlink.linked_user_id = 0;
      await accountToUnlink.save();
    }
    return response.redirect("back");
  }
}

module.exports = RegisteredListController;
