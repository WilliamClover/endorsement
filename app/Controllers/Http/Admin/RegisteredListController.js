"use strict";
const User = use("App/Models/User");
const Database = use("Database");
const Mail = use("Mail");
const sgMail = use("@sendgrid/mail");
const Env = use("Env");

class RegisteredListController {
  async showUsersList({ view }) {
    const linkedUsers = await Database.table("client_contact_details")
      .distinct("client_contact_name")
      .distinct("client_contact_id");
    const users = await Database.from("users")
      .orderBy("accstatus", "desc")
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
        to: request.input("email"),
        from: "dev@clover-brokers.com",
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

  async disableUser({ request, response }) {
    // return console.log(request.input("status"))
    const accountToDelete = await User.query()
      .where("email", request.input("email"))
      .first();
    if (!accountToDelete) {
      session.flash({
        alert: {
          type: "error",
          message: "This account does not exist.",
        },
      });
    } else {
      accountToDelete.accstatus = request.input("status");
      accountToDelete.linked_user_id = 0;
      await accountToDelete.save();
      let today = new Date().toLocaleDateString();
      await Database.table("acc_status_history").insert({
        user_id: accountToDelete.id,
        acc_status: 3,
        date_update: today,
      });
      // send confirmation emailg
      sgMail.setApiKey(Env.get("SENDGRID_API_KEY"));
      if (request.input("status") == 3) {
        const msg = {
          //to: request.input("email"),
          to: "williamelturk@gmail.com",
          from: "w3lb.com@gmail.com",
          subject: "You Clover account is disabled",
          templateId: "23a531f6-8ff1-46dd-9184-954bde51d794",
          substitutions: {
            name: accountToDelete.firstname,
            email: request.input("email")
          }
        };
        sgMail.send(msg, (error, result) => {
          if (error) {
            console.log(error);
          } else {
            console.log("That's wassup!");
          }
        });
      } else {
        const msg = {
          //to: request.input("email"),
          to: "williamelturk@gmail.com",
          from: "w3lb.com@gmail.com",
          subject: "You Clover account is enabled",
          templateId: "093543ff-110f-4f8a-afb8-6e22c3cee17b",
          substitutions: {
            name: accountToDelete.firstname,
            email: request.input("email")
          }
        };
        sgMail.send(msg, (error, result) => {
          if (error) {
            console.log(error);
          } else {
            console.log("That's wassup!");
          }
        });
      }
    }
    return response.redirect("back");
  }

  async linkUser({ request, response }) {
    const accountToLink = await User.query()
      .where("id", request.input("registeredUserId"))
      .first();
    accountToLink.linked_user_id = request.input("linkedUserId");
    accountToLink.accstatus = 2;
    await accountToLink.save();
    let today = new Date().toLocaleDateString();
    const accStatusHistory = await Database.table("acc_status_history").insert({
      user_id: accountToLink.id,
      acc_status: 2,
      date_update: today,
    });

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
      accountToUnlink.accstatus = 1;
      await accountToUnlink.save();
      let today = new Date().toLocaleDateString();
      const accStatusHistory = await Database.table(
        "acc_status_history"
      ).insert({
        user_id: accountToUnlink.id,
        acc_status: 1,
        date_update: today,
      });
    }
    return response.redirect("back");
  }
}

module.exports = RegisteredListController;
