'use strict'
const Database = use("Database");

class AccountController {
    async myProfile({ view, auth }) {
        const user_id = auth.user.linked_user_id;
        const userInfo = await Database.select("firstname", "lastname", "email", "phonenumber").from("users").where("linked_user_id", user_id).first()
        console.log(userInfo)
        return view.render("account/my_profile", { userInfo });
    }
}

module.exports = AccountController
