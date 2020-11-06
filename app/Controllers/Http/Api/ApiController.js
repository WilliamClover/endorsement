"use strict";
const Database = use("Database");
const Axios = use("axios");
const sgMail = use("@sendgrid/mail");
const Env = use("Env");

class ApiController {
  async addHealthTempCats({ params, request, response }) {
    const pid = params.pid;
    const wid = params.wid;
    const endorsement_id = params.endid;

    const addHealthTempTbl = await Database.table("add_health_temp_cats")
      .where("policy_id", pid)
      .where("web_req_id", wid)
      .update({ endorsement_id: endorsement_id });

    response.header("Content-type", "application/json");
    response.send({
      response: "success",
    });
  }
  async deleteHealthTempCats({ params, request, response }) {
    const pid = params.pid;
    const wid = params.wid;
    const endorsement_id = params.endid;

    const deleteHealthTempTbl = await Database.table("delete_health_temp_cats")
      .where("policy_id", pid)
      .where("web_req_id", wid)
      .update({ endorsement_id: endorsement_id });

    response.header("Content-type", "application/json");
    response.send({
      response: "success",
    });
  }
  async apiTest({ response, session, view }) {
    const dataToTest = {
      company_name: "KIKO MIDDLE EAST FZ LLC",
      s_department: "OFFICE",
      employee_staff_id: 282826,
      first_name: "Zaid Noureddin",
      last_name: "Aljabari",
      marital_status: "1= SINGLE",
      cost_sharing: "CO-NIL",
      dob: "1989-04-29",
      gender: "1= MALE",
      nationality: "Jordan",
      position: "Regional Trainer - Kiko",
      grade: 8,
      relation: "1= PRINCIPAL",
      mobile: "971566956855",
      email: "Zaid.Aljabari@azadea.com",
      master_account: "AZADEA GROUP HOLDING - UAE",
      web_req_id: 1,
      Add_health_temp_id: 1
    };
    const addHealthTempTbl = await Database.insert(dataToTest).into(
      "add_health_temps"
    );
    if (addHealthTempTbl) {
      dataToTest.id = addHealthTempTbl[0];
      const dataToTestCat = {
        policy_id: "CBME_7_44",
        cat: 2222222,
        Add_health_temp_id: addHealthTempTbl[0],
        web_req_id: 123,
        person_id: 28,
        limits: 10000,
        lob: 2,
      };
      const addHealthTempTblCat = await Database.insert(dataToTestCat).into(
        "add_health_temp_cats"
      );
      Axios({
        method: "post",
        url: "http://10.0.0.7:3002/api/v1/addHealthTempCat",
        data: {
          "policy_id": "061_13_0611",
          "cat": "category 1",
          "Add_health_temp_id": 1,
          "web_req_id": 8
        },
      })
        .then(function (res) {
          session.flash({ notification: "Update successful!" });
          return response.redirect("back");
        })
        .catch(function (error) {
          console.log("ApiController", error);
        });
      session.flash({ notification: "Updated successfully!" });
      response.redirect("back");
    }
  }
  async statusChanged({ params, request, response }) {
    const apiQuery = await Database.table('add_health_temp_cats').where("id", params.id).first()
    const userInfo = await Database.table('users').where("linked_user_id", apiQuery.person_id).first()
    const email = userInfo.email;
    const firstname = userInfo.firstname;
    const policyId = apiQuery.policy_id;
    const policyStatus = apiQuery.status;


    // send confirmation emailg

    sgMail.setApiKey(Env.get("SENDGRID_API_KEY"));
    const msg = {
      //to: request.input("email"),
      to: email,
      from: "w3lb.com@gmail.com",
      subject: "Policy:" + policyId,
      html: "Hello " + firstname + ",<br/>Your policy: <strong>" + policyId + "</strong> is now '" + policyStatus + "'",
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
    return console.log(email, firstname, policyId, policyStatus)
  }
}

module.exports = ApiController;
