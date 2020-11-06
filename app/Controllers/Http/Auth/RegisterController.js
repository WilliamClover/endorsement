"use strict";

const { validateAll } = use("Validator");
const User = use("App/Models/User");
const Database = use("Database");
const randomString = use("random-string");
const Mail = use("Mail");
const speakeasy = use("speakeasy");
const qrcode = use("qrcode");
const Env = use("Env");
const client = use("twilio")(
  Env.get("TWILIO_ACCOUNT_SID"),
  Env.get("TWILIO_AUTH_TOKEN")
);
const sgMail = use("@sendgrid/mail");

class RegisterController {
  showRegister({ view }) {
    return view.render("auth.register.register1");
  }
  async register({ request, session, response }) {
    //validate form inputs
    const validation = await validateAll(request.all(), {
      firstname: "required",
      lastname: "required",
      phonenumber: "required",
    });
    /////validation for [unique phonenumber] and [not cancelled] START
    const uniquePhoneNumbCount = await User.query()
      .where("phonenumber", request.input("phonenumber"))
      .whereNot("accstatus", 3)
      .count("* as total");
    if (uniquePhoneNumbCount[0].total != 0) {
      if (validation.fails() == false) {
        validation._errorMessages = [];
      }
      validation._errorMessages.push({
        message:
          "The phone number you entered already exists, please use another phone number",
        field: "phonenumber",
        validation: "unique",
      });
      validation.fails(function () {
        return true;
      });
    }
    /////validation for [unique phonenumber] and [not cancelled] END
    if (validation.fails()) {
      session.withErrors(validation.messages());
      return response.redirect("back");
    }
    const register1Data = {
      firstname: request.input("firstname"),
      lastname: request.input("lastname"),
      phonenumber: request.input("phonenumber"),
    };
    session.put("register1Data", register1Data);
    await client.verify
      .services(Env.get("TWILIO_SERVICE_ID"))
      .verifications.create({
        to: request.input("phonenumber"),
        channel: "sms",
      })
      .then((data) => {
        console.log("registerController", data);
        return response.redirect("/register2");
      })
      .catch((e) => {
        session.flash({
          alert: {
            type: "error",
            message: e.message,
          },
        });
        console.error("Got an error:", e.code, e.message);
        return response.redirect("/register3");
        return response.redirect("back");
      });

    //TWILIO OTP END
  }

  showRegister2({ session, view }) {
    const register1Data = session.get("register1Data");
    if (register1Data) {
      return view.render("auth.register.register2");
    } else {
      return view.render("auth.register.register1");
    }
  }
  async register2({ request, response, session }) {
    const userData = session.get("register1Data");
    const phonenumber = userData.phonenumber;
    const otpCode = request.input("otp");

    const verifyPhoneNumber = await client.verify
      .services(Env.get("TWILIO_SERVICE_ID"))
      .verificationChecks.create({
        to: `+${phonenumber}`,
        code: otpCode,
      })
      .then((data) => {
        //response.status(200).json(data);
        return data;
      });
    if (verifyPhoneNumber.status === "approved") {
      session.forget("register1Data");
      session.put("register2Data", userData);
      return response.redirect("/register3");
    } else {
      session.flash({
        alert: {
          type: "error",
          message: "The OTP you entered is incorrect",
        },
      });
      return response.redirect("back");
    }

    //response.status(200).json({ data: request });
  }

  showRegister3({ session, view }) {
    return view.render("auth.register.register3"); //to be removed when twilio
    const register2Data = session.get("register2Data");
    if (register2Data) {
      return view.render("auth.register.register3");
    } else {
      return view.render("auth.register.register1");
    }
  }
  async register3({ request, session, response }) {
    const userData = session.get("register2Data");

    //validate form inputs
    const validation = await validateAll(
      request.all(),
      {
        email: "required|email",
        password:
          "required|regex:(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])|min:8|max:30|confirmed",
      },
      {
        "password.min": "Password must be minimum 8 characters",
        "password.max": "Password must be maximum 30 characters",
        "password.regex":
          "Password must contain at least one lowercase letter, one uppercase letter, one numeric digit, and one special character",
      }
    );
    /////validation for [unique email] and [not cancelled] START
    const uniqueEmailCount = await User.query()
      .where("email", request.input("email"))
      .whereNot("accstatus", 3)
      .count("* as total");
    if (uniqueEmailCount[0].total != 0) {
      if (validation.fails() == false) {
        validation._errorMessages = [];
      }
      validation._errorMessages.push({
        message:
          "The email you entered is already in use, <a href='/password/reset'>Forgot password?</a>",
        field: "email",
        validation: "unique",
      });
      validation.fails(function () {
        return true;
      });
    }
    /////validation for [unique email] and [not cancelled] END
    if (validation.fails()) {
      session
        .withErrors(validation.messages())
        .flashExcept(["password", "password_confirmation"]);
      return response.redirect("back");
    }
    userData["email"] = request.input("email");
    userData["confirmation_token"] = randomString({ length: 40 });
    userData["password"] = request.input("password");
    console.log(request.input("password"));
    //create use('Route')
    const user = await User.create(userData);
    // send confirmation emailg
    sgMail.setApiKey(Env.get("SENDGRID_API_KEY"));
    const msg = {
      to: userData["email"],
      from: Env.get("SENDGRID_EMAIL_FROM"),
      subject: "Activate your Clover account",
      templateId: "56b0163c-8faf-4951-af12-e0a39d75670c",
      substitutions: {
        name: userData["firstname"],
        urlToConfirm:
          Env.get("APP_URL") +
          "/register/confirm/" +
          userData["confirmation_token"],
      },
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
    return response.redirect("register4");
  }

  showRegister4({ session, view }) {
    if (session.get("register2Data")) {
      const email = session.get("register2Data")["email"];
      session.forget("register2Data");
      return view.render("auth.register.register4", { email: email });
    } else {
      return view.render("auth.register.register1");
    }
  }

  async confirmEmail({ params, session, response }) {
    //get user with the confirmation token
    const user = await User.findBy("confirmation_token", params.token);
    session.put("userEmail", user.email);

    //set confirmation to null and is_active to true
    user.confirmation_token = null;
    user.accstatus = 1;

    //persist user to database
    await user.save();
    let today = new Date().toLocaleDateString();
    const accStatusHistory = await Database.table("acc_status_history").insert({
      user_id: user.id,
      acc_status: 1,
      date_update: today,
    });

    //display  success message
    session.flash({
      successMsg: {
        message: "Your email address has been confirmed",
      },
    });

    return response.redirect("/login");
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
  async verifyAuthy({ request, response, session }) {
    const userData = session.get("userData");
    userData["secret_totp"] = request.input("secret");
    const validation = await validateAll(request.all(), {
      otp: "required",
    });
    if (validation.fails()) {
      session.withErrors(validation.messages());
      return response.redirect("back");
    }

    var verified = speakeasy.totp.verify({
      secret: request.input("secret"),
      encoding: "base32",
      token: request.input("otp"),
    });

    if (verified === true) {
      //create use('Route')
      const user = await User.create(userData);
      // send confirmation email
      await Mail.send("auth.emails.confirm_email", user.toJSON(), (message) => {
        message
          .to(Env.get("CONFIRMATION_EMAIL"))
          .from("noreply@cloverbrokers.com")
          .subject("Please confirm the email address");
      });
      session.flash({
        alert: {
          type: "success",
          message:
            "You have successfully created your account, you will soon recieve your approval to be able to login",
        },
      });
    } else {
      session.flash({
        alert: {
          type: "error",
          message: "The code was not successfully verified ",
        },
      });
    }
    return response.redirect("/register");
  }
}

module.exports = RegisterController;
