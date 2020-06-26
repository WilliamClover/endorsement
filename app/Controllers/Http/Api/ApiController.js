"use strict";
const Database = use("Database");
const Axios = use("axios");

class ApiController {
  async addHealthTempCats({ params, request, response }) {
    const pid = params.pid;
    const wid = params.wid;
    const endorsement_id = request.input("endorsement_id");

    const addHealthTempTbl = await Database.table("add_health_temp_cats")
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
      gender: "1= MALE",
      dob: "1989-04-29 00:00:00.000",
      nationality: "Jordan",
      position: "Regional Trainer - Kiko",
      grade: 8,
      relation: "1= PRINCIPAL",
      mobile: "971566956855",
      email: "Zaid.Aljabari@azadea.com",
      COST_SHARING: "CO-NIL",
      CONTACT: "FATHALLAH YARA",
      MASTER: "AZADEA GROUP HOLDING - UAE",
      web_req_id: 1,
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
        limits: 10000,
        lob: 2,
      };
      const addHealthTempTblCat = await Database.insert(dataToTestCat).into(
        "add_health_temp_cats"
      );
      Axios({
        method: "post",
        url: "http://10.0.0.7:3002/api/v1/addHealthTempCat",
        data: [dataToTestCat, dataToTest],
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
}

module.exports = ApiController;
