"use strict";

const { validate, validateAll } = use("Validator");
const User = use("App/Models/User");
const PasswordReset = use("App/Models/PasswordReset");
const randomString = use("random-string");
const Mail = use("Mail");
const Hash = use("Hash");
const Env = use("Env");
const sgMail = use("@sendgrid/mail");

class PasswordResetController {
  showLinkRequestForm({ view }) {
    return view.render("auth.passwords.email");
  }
  async sendResetLinkEmail({ request, session, response }) {
    // validate form inputs
    const validation = await validate(request.only("email"), {
      email: "required|email",
    });
    if (validation.fails()) {
      session.withErrors(validation.messages()).flashAll();
      return response.redirect("back");
    }
    try {
      const user = await User.findBy("email", request.input("email"));
      await PasswordReset.query().where("email", user.email).delete();

      const { token } = await PasswordReset.create({
        email: user.email,
        token: randomString({ length: 40 }),
      });
      // const mailData = {
      //   user: user.toJSON(),
      //   token,
      // };

      // await Mail.send("auth.emails.password_reset", mailData, (message) => {
      //   message
      //     .to(user.email)
      //     .from("resetPassword@cloverbrokers.com")
      //     .subject("Password Reset Link");
      // });
      // send confirmation email
      sgMail.setApiKey(Env.get("SENDGRID_API_KEY"));
      const msg = {
        //to: request.input("email"),
        to: user.email,
        from: Env.get("SENDGRID_EMAIL_FROM"),
        subject: "Password Reset Link",
        html:
          "<p>Hi " +
          user.firstname +
          "</p><p>Welcome To Clover,<br/><br/>Please use the link below to reset your password</p><p><a href='" +
          Env.get("APP_URL") +
          "/password/reset/" +
          token +
          "'>Reset Password</a>",
      };
      sgMail
        .send(msg)
        .then(() => {
          const flashMessage = "Message Sent to the activated account";
        })
        .catch((error) => {
          const flashMessage = error.response.body;
          console.log("RegisterController", error.response.body);
        });

      session.flash({
        alert: {
          type: "success",
          message: "A password reset link has been sent to your email address",
        },
      });

      return response.redirect("back");
    } catch (error) {
      session.flash({
        alert: {
          type: "error",
          message: "Sorry, there is no user with this email address",
        },
      });
      return response.redirect("back");
    }
  }
  showResetForm({ params, view }) {
    return view.render("auth.passwords.reset", {
      token: params.token,
    });
  }
  async reset({ request, session, response }) {
    const validation = await validateAll(request.all(), {
      token: "required",
      email: "required|email",
      password: "required|confirmed",
    });
    if (validation.fails()) {
      session
        .withErrors(validation.messages())
        .flashExcept(["password", "password_confirmation"]);
      return response.redirect("back");
    }
    try {
      const user = await User.findBy("email", request.input("email"));
      //check if password reset token exist for user
      const token = await PasswordReset.query()
        .where("email", user.email)
        .where("token", request.input("token"))
        .first();
      if (!token) {
        session.flash({
          alert: {
            type: "error",
            message: "This password reset token does not exist",
          },
        });
        return response.redirect("back");
      }

      //user.password = await Hash.make(request.input("password"));
      user.password = request.input("password");

      await user.save();
      await PasswordReset.query().where("email", user.email).delete();
      session.flash({
        alert: {
          type: "success",
          message: "Your password has been reset successfully!",
        },
      });
      return response.redirect("/login");
    } catch (error) {
      session.flash({
        alert: {
          type: "error",
          message: "Sorry, there is no user with this email address",
        },
      });
      return response.redirect("back");
    }
  }
}

module.exports = PasswordResetController;
