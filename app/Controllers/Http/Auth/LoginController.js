"use strict";
const { validateAll } = use("Validator");
const User = use("App/Models/User");
const Database = use("Database");
const Hash = use("Hash");
const Env = use("Env");
const speakeasy = use("speakeasy");
const qrcode = use("qrcode");
const client = use("twilio")(
  Env.get("TWILIO_ACCOUNT_SID"),
  Env.get("TWILIO_AUTH_TOKEN")
);

class LoginController {
  showLogin({ session, view }) {
    session.forget("request_all");
    return view.render("auth.login.login1");
  }
  async login({ request, auth, session, response }) {
    //if is_canceled != 0, means the account is deleted and the user is not able to connect
    session.put("request_all", request.all());
    const firstTimeLogin = await Database.select("secret_totp")
      .from("users")
      .where("email", request.input("email"))
      .where("is_canceled", 0)
      .first();
    if (firstTimeLogin.secret_totp == null) {
      return response.route("login2");
    } else {
      return response.route("loginOTP");
    }
  }
  showLogin2({ session, view, response }) {
    if (session.get("request_all")) {
      return view.render("auth.login.login2");
    } else {
      return response.route("login");
    }
  }
  async login2({ request, auth, session, response }) {
    const { email } = session.get("request_all");
    const fa2 = request.input("fa2");
    if (fa2 == "sms") {
      const affectedRows = await Database.table("users")
        .where("email", email)
        .update("secret_totp", fa2);
      return response.route("loginOTP");
    } else {
      return response.route("verifyAuthy");
    }
  }
  async loginOTP({ view, session, response }) {
    const { email, password, remember } = session.get("request_all");
    const user = await User.query()
      .where("email", email)
      .whereNot("accstatus", 0)
      .where("is_canceled", 0)
      .first();
    //verify password
    if (user) {
      const passwordVerified = await Hash.verify(password, user.password);
      if (passwordVerified) {
        if (user.secret_totp == "sms") {
          //TWILIO OTP START
          await client.verify
            .services(Env.get("TWILIO_SERVICE_ID"))
            .verifications.create({
              to: user.phonenumber,
              channel: "sms",
            })
            .then((data) => {
              //check how to return a success and errors on twilio
              return data;
            });
          //TWILIO OTP END
        }
        return view.render("auth.loginOTP", { secret: user.secret_totp });
      }
      //display error
      session.flash({
        alert: {
          type: "error",
          message: `Your username or password are incorrect`,
        },
      });
      return response.redirect("login");
    }
    //display error
    session.flash({
      alert: {
        type: "error",
        message: `We couldn't verify your credentials. Make sure you've confirmed your email address`,
      },
    });
    return response.redirect("login");
  }
  async verifyloginOTP({ request, auth, session, response }) {
    const otpCode = request.input("otp");
    const { email, password, remember } = session.get("request_all");
    const user = await User.query()
      .where("email", email)
      .whereNot("accstatus", 0)
      .where("is_canceled", 0)
      .first();
    const verifyPhoneNumber = await client.verify
      .services(Env.get("TWILIO_SERVICE_ID"))
      .verificationChecks.create({
        to: user.phonenumber,
        code: otpCode,
      })
      .then((data) => {
        //response.status(200).json(data);
        return data;
      });

    if (verifyPhoneNumber.status === "approved") {
      //login user
      await auth.remember(!!remember).login(user);
      return response.route("home");
    }
    //display error
    session.flash({
      alert: {
        type: "error",
        message: `The OTP you entered is incorrect`,
      },
    });
    return response.redirect("login");
  }
  async verifyloginAuthy({ request, auth, session, response }) {
    const otpCode = request.input("otp");
    const { email, password, remember } = session.get("request_all");
    const user = await User.query()
      .where("email", email)
      .whereNot("accstatus", 0)
      .where("is_canceled", 0)
      .first();

    var verified = speakeasy.totp.verify({
      secret: user.secret_totp,
      encoding: "base32",
      token: otpCode,
      window: 2,
    });

    if (verified === true) {
      //login user
      await auth.remember(!!remember).login(user);
      return response.route("home");
    }
    //display error
    session.flash({
      alert: {
        type: "error",
        message: `The Authy OTP you entered is incorrect`,
      },
    });
    return response.redirect("login");
  }

  async showVerifyAuthy({ view, session }) {
    const secret = await speakeasy.generateSecret({ length: 10 });
    const customUrl = speakeasy.otpauthURL({
      secret: secret.ascii,
      label: "Clover Brokers",
      issuer: "Clover",
    });
    const QRcode = await qrcode.toDataURL(customUrl).then((data) => {
      return data;
    });
    return view.render("auth.verifyAuthy", {
      QRcode: QRcode,
      secret: secret.base32,
    });
  }
  async verifyAuthy({ request, response, auth, session }) {
    const { email, password, remember } = session.get("request_all");
    const secret_totp = request.input("secret");
    const validation = await validateAll(request.all(), {
      otp: "required",
    });

    const user = await User.query()
      .where("email", email)
      .whereNot("accstatus", 0)
      .where("is_canceled", 0)
      .first();

    if (validation.fails()) {
      session.withErrors(validation.messages());
      return response.redirect("back");
    }

    var verified = speakeasy.totp.verify({
      secret: request.input("secret"),
      encoding: "base32",
      token: request.input("otp"),
      window: 2,
    });

    if (verified === true) {
      const affectedRows = await Database.table("users")
        .where("email", email)
        .update("secret_totp", secret_totp);

      //login user
      await auth.remember(!!remember).login(user);
      return response.route("home");
    } else {
      session.flash({
        alert: {
          type: "error",
          message: "The code was not successfully verified ",
        },
      });
      return response.redirect("back");
    }
  }
}

module.exports = LoginController;
