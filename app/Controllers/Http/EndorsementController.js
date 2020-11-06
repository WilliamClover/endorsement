"use strict";
const User = use("App/Models/User");
const Database = use("Database");
const Env = use("Env");
const Helpers = use("Helpers");
const sgMail = use("@sendgrid/mail");
const Axios = use("axios");

function getPolicies(userId) {
  return Database.table("policies")
    .innerJoin("contact_links_tbl", function () {
      this.on(
        "policies.master_policy_clover_id",
        "contact_links_tbl.master_policy_clover_id"
      );
    })
    .where("contact_links_tbl.client_contact_id", userId);
}

class EndorsementController {
  async dashboard({ view, auth }) {
    const policiesCount = await getPolicies(auth.user.linked_user_id).count(
      "* as length"
    );
    const ongoingAddRequestsCount = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", "ongoing")
      .count("* as length");
    const ongoingDeleteRequestsCount = await Database.table(
      "delete_health_temps"
    )
      .innerJoin("contact_links_tbl", function () {
        this.on(
          "delete_health_temps.master_policy_clover_id",
          "contact_links_tbl.master_policy_clover_id"
        );
      })
      .where("contact_links_tbl.client_contact_id", auth.user.linked_user_id)
      .count("* as length");

    let addRequests = await Database.table("add_health_temps")
      .innerJoin("add_health_temp_cats", function () {
        this.on(
          "add_health_temps.Add_health_temp_id",
          "add_health_temp_cats.Add_health_temp_id"
        ).andOn(
          "add_health_temps.web_req_id",
          "add_health_temp_cats.web_req_id"
        );
      })
      .where("add_health_temp_cats.person_id", auth.user.linked_user_id)
      .whereNot("add_health_temp_cats.endorsement_id", null)
      .limit(4);

    let deleteRequests = await Database.table("delete_health_temps")
      .innerJoin("contact_links_tbl", function () {
        this.on(
          "delete_health_temps.master_policy_clover_id",
          "contact_links_tbl.master_policy_clover_id"
        );
      })
      .where("contact_links_tbl.client_contact_id", auth.user.linked_user_id)
      .limit(4);

    return view.render("endorsement/dashboard", {
      policiesLength: policiesCount[0].length,
      ongoingAddRequestsLength: ongoingAddRequestsCount[0].length,
      ongoingDeleteRequestsLength: ongoingDeleteRequestsCount[0].length,
      addRequests: addRequests,
      deleteRequests: deleteRequests,
    });
  }
  async myPolicies({ view, auth }) {
    const policies = await getPolicies(auth.user.linked_user_id);
    const distinctMaster = await getPolicies(auth.user.linked_user_id).distinct(
      "policies.master_account"
    );

    return view.render("endorsement/my_policies", {
      policies: policies,
      distinctContacts: distinctMaster,
    });
  }
  async myCompletedRequests({ view, auth }) {
    const policiesFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", "completed")
      .whereNot("endorsement_id", null)
      .distinct("policy_id");
    let policiesFromAddArray = policiesFromAddDb.map((a) => a.policy_id);

    const policiesFromAdd = await getPolicies(auth.user.linked_user_id).whereIn(
      "contact_links_tbl.master_policy_clover_id",
      policiesFromAddArray
    );

    const endorsIdFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .whereNot("endorsement_id", null)
      .distinct("endorsement_id")
      .distinct("policy_id")
      .distinct("date");

    const policiesFromDeleteDb = await Database.table("census_to_delete")
      .where("person_id", auth.user.linked_user_id)
      .whereNot("endorsement_id", null)
      .distinct("policy_id");
    let policiesFromDeleteArray = policiesFromDeleteDb.map((a) => a.policy_id);

    const policiesFromDelete = await getPolicies(
      auth.user.linked_user_id
    ).whereIn("policies.master_policy_clover_id", policiesFromDeleteArray);

    const endorsIdFromDeleteDb = await Database.table("census_to_delete")
      .where("person_id", auth.user.linked_user_id)
      .whereNot("endorsement_id", null);

    return view.render("endorsement/my_completed_requests", {
      policiesFromAdd: policiesFromAdd,
      endorsIdFromAddDb: endorsIdFromAddDb,
      policiesFromDelete: policiesFromDelete,
      endorsIdFromDeleteDb: endorsIdFromDeleteDb,
    });
  }
  async myRequestsDetails({ view, auth, request }) {
    const myRequestsData = request.body;
    if (myRequestsData.section == "add") {
      let myRequestsEntries = await Database.table("add_health_temps")
        .innerJoin("add_health_temp_cats", function () {
          this.on(
            "add_health_temps.Add_health_temp_id",
            "add_health_temp_cats.Add_health_temp_id"
          ).andOn(
            "add_health_temps.web_req_id",
            "add_health_temp_cats.web_req_id"
          );
        })
        .where(
          "add_health_temp_cats.endorsement_id",
          myRequestsData.endorsement_id
        )
        .where("status", myRequestsData.status);

      return view.render("endorsement/my_requests_details", {
        myRequestsEntries: myRequestsEntries,
        endorsement_id: myRequestsData.endorsement_id,
      });
    } else {
      const census_id = myRequestsData.census_id;
      //let completedRequests = await Database.table("census").where("id", census_id);
      const policiesFromAddDb = await Database.table("add_health_temp_cats")
        .where("person_id", auth.user.linked_user_id)
        .where("status", "completed")
        .whereNot("endorsement_id", null)
        .distinct("policy_id");
      let completedRequests = policiesFromAddDb.map((a) => a.policy_id);
      return view.render("endorsement/my_requests_details", {
        completedRequests: completedRequests,
        endorsement_id: myRequestsData.endorsement_id,
      });
    }
  }
  async myRequests({ view, auth, session }) {
    let webReqIdFromAddHealthTemp;
    let endorsementIdFromAddHealthTemp;
    if (session.get("webReqId")) {
      webReqIdFromAddHealthTemp = session.get("webReqId");
      const endorsementIdFromDb = await Database.table("add_health_temp_cats")
        .where("person_id", auth.user.linked_user_id)
        .where("web_req_id", webReqIdFromAddHealthTemp)
        .distinct("endorsement_id");
      endorsementIdFromAddHealthTemp = endorsementIdFromDb.map(
        (a) => a.endorsement_id
      );
    }
    const policiesFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", "ongoing")
      .whereNot("endorsement_id", null)
      .distinct("policy_id");
    let policiesFromAddArray = policiesFromAddDb.map((a) => a.policy_id);

    const policiesFromAdd = await getPolicies(auth.user.linked_user_id).whereIn(
      "policies.master_policy_clover_id",
      policiesFromAddArray
    );

    const endorsIdFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .whereNot("endorsement_id", null)
      .distinct("endorsement_id")
      .distinct("policy_id")
      .distinct("date");

    const ongoingFtpRequests = await Database.table("add_health_temps")
      .where("client_contact_id", auth.user.linked_user_id)
      .whereNot("created_at", null);
    const invalidFtpRequests = await Database.table("add_health_temp_errors")
      .where("client_contact_id", auth.user.linked_user_id)
      .whereNot("created_at", null);
    const invalidRequests = await Database.table("add_health_temp_errors")
      .where("client_contact_id", auth.user.linked_user_id)
      .where("created_at", null);

    const personDbRejected = await Database.select(
      "add_health_temps.first_name",
      "add_health_temps.last_name",
      "person_rejection_reason.policy_id",
      "person_rejection_reason.reason",
      "person_rejection_reason.rejection_date",
      "person_rejection_reason.Add_health_temp_id",
      "person_rejection_reason.web_req_id"
    )
      .from("person_rejection_reason")
      .innerJoin("add_health_temps", function () {
        this.on(
          "person_rejection_reason.Add_health_temp_id",
          "add_health_temps.Add_health_temp_id"
        ).andOn(
          "person_rejection_reason.web_req_id",
          "add_health_temps.web_req_id"
        );
      });

    const deletionDbRejected = await Database.select(
      "census.first_name",
      "census.last_name",
      "census_to_delete_log.policy_id",
      "census_to_delete_log.date_of_request",
      "census_to_delete_log.Add_health_temp_id",
      "census_to_delete_log.web_req_id"
    )
      .from("census_to_delete_log")
      .innerJoin("census", function () {
        this.on(
          "census_to_delete_log.Add_health_temp_id",
          "census.Add_health_temp_id"
        ).andOn("census_to_delete_log.web_req_id", "census.web_req_id");
      });

    return view.render("endorsement/my_requests", {
      webReqIdFromAddHealthTemp: webReqIdFromAddHealthTemp,
      endorsementIdFromAddHealthTemp: endorsementIdFromAddHealthTemp,
      policiesFromAdd: policiesFromAdd,
      endorsIdFromAddDb: endorsIdFromAddDb,
      personDbRejected: personDbRejected,
      deletionDbRejected: deletionDbRejected,
      ongoingFtpRequests: ongoingFtpRequests,
      invalidFtpRequests: invalidFtpRequests,
      invalidRequests: invalidRequests,
    });
  }
  async byPolicy({ view, auth, session }) {
    const policiesFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", "ongoing")
      .whereNot("endorsement_id", null)
      .distinct("policy_id");
    let policiesFromAddArray = policiesFromAddDb.map((a) => a.policy_id);

    const policiesFromAdd = await getPolicies(auth.user.linked_user_id).whereIn(
      "policies.master_policy_clover_id",
      policiesFromAddArray
    );

    const endorsIdFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .whereNot("endorsement_id", null)
      .distinct("endorsement_id")
      .distinct("policy_id")
      .distinct("date");
    return view.render("endorsement/my_requests_sub/by_policy", {
      policiesFromAdd: policiesFromAdd,
      endorsIdFromAddDb: endorsIdFromAddDb,
    });
  }
  async byWebReqId({ view, auth, session }) {
    const webReqIdsDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .where("status", "ongoing")
      .whereNot("endorsement_id", null)
      .distinct("web_req_id");
    //let policiesFromAddArray = policiesFromAddDb.map((a) => a.web_req_id);

    //const policiesFromAdd = await getPolicies(auth.user.linked_user_id).whereIn("policies.web_req_id", policiesFromAddArray)
    const endorsIdFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .whereNot("endorsement_id", null)
      .distinct("endorsement_id")
      .distinct("web_req_id")
      .distinct("date");

    //return console.log(endorsIdFromAddDb)

    return view.render("endorsement/my_requests_sub/by_webreqid", {
      webReqIdsDb: webReqIdsDb,
      endorsIdFromAddDb: endorsIdFromAddDb,
    });
  }
  async deleteRejectedPerson({ auth, request, response }) {
    const insertedData = request.input("data")[0];
    const memberToDelete = await Database.table("add_health_temps")
      .where("web_req_id", insertedData.web_req_id)
      .where("Add_health_temp_id", insertedData.Add_health_temp_id)
      .first();
    delete memberToDelete.id;
    if (memberToDelete && memberToDelete != undefined) {
      await Database.from("deleted_insured_from_endorsement").insert(
        memberToDelete
      );
      await Database.table("person_rejection_reason")
        .where("web_req_id", insertedData.web_req_id)
        .where("Add_health_temp_id", insertedData.Add_health_temp_id)
        .delete();
    }
    return "You have successfully deleted this member";
  }
  async resubmitRejectedPerson({ auth, request, response, session }) {
    const memberToResubmit = await Database.table("add_health_temps")
      .where("web_req_id", request.body.web_req_id)
      .where("Add_health_temp_id", request.body.Add_health_temp_id)
      .first();
    delete memberToResubmit.id;
    memberToResubmit["policy"] = request.body.policy_id;
    memberToResubmit["person_rejection_reason"] = request.body.reason;
    if (memberToResubmit && memberToResubmit != undefined) {
      session.put(
        "memberToResubmit",
        JSON.parse(JSON.stringify(memberToResubmit))
      );
      return response.redirect("showResubmitRejectedPerson");
    }
  }
  async showResubmitRejectedPerson({ auth, session, response, view }) {
    const memberToResubmitSession = session.get("memberToResubmit");
    var cor = memberToResubmitSession.cor;
    let memberToResubmit = {
      "Company Name": memberToResubmitSession["company_name"],
      "Shop or Site or Department": memberToResubmitSession["company_name"],
      "Employee Staff ID": memberToResubmitSession["company_name"],
      "First Name": memberToResubmitSession["first_name"],
      "Second Name": memberToResubmitSession["second_name"],
      "Family Name": memberToResubmitSession["company_name"],
      Relation: memberToResubmitSession["relation"],
      DOB: memberToResubmitSession["dob"],
      Gender: memberToResubmitSession["gender"],
      Nationality: memberToResubmitSession["nationality"],
      "Marital Status": memberToResubmitSession["marital_status"],
      "Cost Sharing": memberToResubmitSession["cost_sharing"],
      Position: memberToResubmitSession["position"],
      Grade: memberToResubmitSession["grade"],
      "Mobile No": memberToResubmitSession["mobile"],
      "E-mail": memberToResubmitSession["email"],
      "NATIONAL ID": memberToResubmitSession["company_name"],
      "SAUDI ID": memberToResubmitSession["saudi_id"],
      "IQAMA NO.": memberToResubmitSession["iqama_id"],
      "IQAMA EXPIRY DATE": memberToResubmitSession["iqama_expire_at"],
      "SPONSOR ID": memberToResubmitSession["sponsor_id"],
      "KUWAIT (KID)": memberToResubmitSession["kuwait_id"],
      "QATAR (QID)": memberToResubmitSession["qatar_id"],
      "EMIRATES ID NO.": memberToResubmitSession["emirates_id"],
      "PASSPORT NO.": memberToResubmitSession["passport_num"],
      UID: memberToResubmitSession["uid"],
      GDRFAFileNumber: memberToResubmitSession["gdrfa_file_number"],
      "EMIRATE OF VISA ISSUANCE":
        memberToResubmitSession["emirate_of_visa_issuance"],
      "MEMBER TYPE": memberToResubmitSession["member_type"],
      "ENTITY TYPE": memberToResubmitSession["entity_type"],
      "ESTABLISHMENT ID#": memberToResubmitSession["establishment_id"],
      "Has the member been previously insured?":
        memberToResubmitSession["previously_insured"],
      "RESIDENTIAL LOCATION": memberToResubmitSession["residential_location"],
      "WORK LOCATION": memberToResubmitSession["work_location"],
      "EMPLOYEES SALARY BRACKET":
        memberToResubmitSession["employees_salary_bracket"],
      COMMISSION: memberToResubmitSession["commission"],
      "ENTITY CONTACT NUMBER": memberToResubmitSession["entity_contact_number"],
      "ENTITY E-MAIL ID": memberToResubmitSession["entity_email_id"],
    };
    if (cor == "DUBAI" || cor == "DUBAI LSB") {
      delete memberToResubmit["NATIONAL ID"];
      delete memberToResubmit["SAUDI ID"];
      delete memberToResubmit["IQAMA NO."];
      delete memberToResubmit["IQAMA EXPIRY DATE"];
      delete memberToResubmit["SPONSOR ID"];
      delete memberToResubmit["KUWAIT (KID)"];
      delete memberToResubmit["QATAR (QID)"];
      delete memberToResubmit["Has the member been previously insured?"];
    } else if (cor == "AUH") {
      delete memberToResubmit["NATIONAL ID"];
      delete memberToResubmit["SAUDI ID"];
      delete memberToResubmit["IQAMA NO."];
      delete memberToResubmit["IQAMA EXPIRY DATE"];
      delete memberToResubmit["SPONSOR ID"];
      delete memberToResubmit["KUWAIT (KID)"];
      delete memberToResubmit["QATAR (QID)"];
      delete memberToResubmit["GDRFAFileNumber"];
      delete memberToResubmit["EMIRATE OF VISA ISSUANCE"];
      delete memberToResubmit["MEMBER TYPE"];
      delete memberToResubmit["ENTITY TYPE"];
      delete memberToResubmit["ESTABLISHMENT ID#"];
      delete memberToResubmit["RESIDENTIAL LOCATION"];
      delete memberToResubmit["WORK LOCATION"];
      delete memberToResubmit["EMPLOYEES SALARY BRACKET"];
      delete memberToResubmit["COMMISSION"];
      delete memberToResubmit["ENTITY CONTACT NUMBER"];
      delete memberToResubmit["ENTITY E-MAIL ID"];
    } else if (cor == "OTHER EMIRATES") {
      delete memberToResubmit["NATIONAL ID"];
      delete memberToResubmit["SAUDI ID"];
      delete memberToResubmit["IQAMA NO."];
      delete memberToResubmit["IQAMA EXPIRY DATE"];
      delete memberToResubmit["SPONSOR ID"];
      delete memberToResubmit["KUWAIT (KID)"];
      delete memberToResubmit["QATAR (QID)"];
      delete memberToResubmit["GDRFAFileNumber"];
      delete memberToResubmit["EMIRATE OF VISA ISSUANCE"];
      delete memberToResubmit["MEMBER TYPE"];
      delete memberToResubmit["ENTITY TYPE"];
      delete memberToResubmit["ESTABLISHMENT ID#"];
      delete memberToResubmit["Has the member been previously insured?"];
      delete memberToResubmit["RESIDENTIAL LOCATION"];
      delete memberToResubmit["WORK LOCATION"];
      delete memberToResubmit["EMPLOYEES SALARY BRACKET"];
      delete memberToResubmit["COMMISSION"];
      delete memberToResubmit["ENTITY CONTACT NUMBER"];
      delete memberToResubmit["ENTITY E-MAIL ID"];
    } else if (cor == "JORDAN") {
      delete memberToResubmit["SAUDI ID"];
      delete memberToResubmit["IQAMA NO."];
      delete memberToResubmit["IQAMA EXPIRY DATE"];
      delete memberToResubmit["SPONSOR ID"];
      delete memberToResubmit["KUWAIT (KID)"];
      delete memberToResubmit["QATAR (QID)"];
      delete memberToResubmit["EMIRATES ID NO."];
      delete memberToResubmit["PASSPORT NO."];
      delete memberToResubmit["UID"];
      delete memberToResubmit["GDRFAFileNumber"];
      delete memberToResubmit["EMIRATE OF VISA ISSUANCE"];
      delete memberToResubmit["MEMBER TYPE"];
      delete memberToResubmit["ENTITY TYPE"];
      delete memberToResubmit["ESTABLISHMENT ID#"];
      delete memberToResubmit["Has the member been previously insured?"];
      delete memberToResubmit["RESIDENTIAL LOCATION"];
      delete memberToResubmit["WORK LOCATION"];
      delete memberToResubmit["EMPLOYEES SALARY BRACKET"];
      delete memberToResubmit["COMMISSION"];
      delete memberToResubmit["ENTITY CONTACT NUMBER"];
      delete memberToResubmit["ENTITY E-MAIL ID"];
    } else if (cor == "KSA") {
      delete memberToResubmit["NATIONAL ID"];
      delete memberToResubmit["KUWAIT (KID)"];
      delete memberToResubmit["QATAR (QID)"];
      delete memberToResubmit["EMIRATES ID NO."];
      delete memberToResubmit["PASSPORT NO."];
      delete memberToResubmit["UID"];
      delete memberToResubmit["GDRFAFileNumber"];
      delete memberToResubmit["EMIRATE OF VISA ISSUANCE"];
      delete memberToResubmit["MEMBER TYPE"];
      delete memberToResubmit["ENTITY TYPE"];
      delete memberToResubmit["ESTABLISHMENT ID#"];
      delete memberToResubmit["Has the member been previously insured?"];
      delete memberToResubmit["RESIDENTIAL LOCATION"];
      delete memberToResubmit["WORK LOCATION"];
      delete memberToResubmit["EMPLOYEES SALARY BRACKET"];
      delete memberToResubmit["COMMISSION"];
      delete memberToResubmit["ENTITY CONTACT NUMBER"];
      delete memberToResubmit["ENTITY E-MAIL ID"];
    } else if (cor == "KUWAIT") {
      delete memberToResubmit["NATIONAL ID"];
      delete memberToResubmit["SAUDI ID"];
      delete memberToResubmit["IQAMA NO."];
      delete memberToResubmit["IQAMA EXPIRY DATE"];
      delete memberToResubmit["SPONSOR ID"];
      delete memberToResubmit["QATAR (QID)"];
      delete memberToResubmit["EMIRATES ID NO."];
      delete memberToResubmit["PASSPORT NO."];
      delete memberToResubmit["UID"];
      delete memberToResubmit["GDRFAFileNumber"];
      delete memberToResubmit["EMIRATE OF VISA ISSUANCE"];
      delete memberToResubmit["MEMBER TYPE"];
      delete memberToResubmit["ENTITY TYPE"];
      delete memberToResubmit["ESTABLISHMENT ID#"];
      delete memberToResubmit["Has the member been previously insured?"];
      delete memberToResubmit["RESIDENTIAL LOCATION"];
      delete memberToResubmit["WORK LOCATION"];
      delete memberToResubmit["EMPLOYEES SALARY BRACKET"];
      delete memberToResubmit["COMMISSION"];
      delete memberToResubmit["ENTITY CONTACT NUMBER"];
      delete memberToResubmit["ENTITY E-MAIL ID"];
    } else if (cor == "QATAR") {
      delete memberToResubmit["NATIONAL ID"];
      delete memberToResubmit["SAUDI ID"];
      delete memberToResubmit["IQAMA NO."];
      delete memberToResubmit["IQAMA EXPIRY DATE"];
      delete memberToResubmit["SPONSOR ID"];
      delete memberToResubmit["KUWAIT (KID)"];
      delete memberToResubmit["EMIRATES ID NO."];
      delete memberToResubmit["PASSPORT NO."];
      delete memberToResubmit["UID"];
      delete memberToResubmit["GDRFAFileNumber"];
      delete memberToResubmit["EMIRATE OF VISA ISSUANCE"];
      delete memberToResubmit["MEMBER TYPE"];
      delete memberToResubmit["ENTITY TYPE"];
      delete memberToResubmit["ESTABLISHMENT ID#"];
      delete memberToResubmit["Has the member been previously insured?"];
      delete memberToResubmit["RESIDENTIAL LOCATION"];
      delete memberToResubmit["WORK LOCATION"];
      delete memberToResubmit["EMPLOYEES SALARY BRACKET"];
      delete memberToResubmit["COMMISSION"];
      delete memberToResubmit["ENTITY CONTACT NUMBER"];
      delete memberToResubmit["ENTITY E-MAIL ID"];
    } else {
      delete memberToResubmit["NATIONAL ID"];
      delete memberToResubmit["SAUDI ID"];
      delete memberToResubmit["IQAMA NO."];
      delete memberToResubmit["IQAMA EXPIRY DATE"];
      delete memberToResubmit["SPONSOR ID"];
      delete memberToResubmit["KUWAIT (KID)"];
      delete memberToResubmit["QATAR (QID)"];
      delete memberToResubmit["EMIRATES ID NO."];
      delete memberToResubmit["PASSPORT NO."];
      delete memberToResubmit["UID"];
      delete memberToResubmit["GDRFAFileNumber"];
      delete memberToResubmit["EMIRATE OF VISA ISSUANCE"];
      delete memberToResubmit["MEMBER TYPE"];
      delete memberToResubmit["ENTITY TYPE"];
      delete memberToResubmit["ESTABLISHMENT ID#"];
      delete memberToResubmit["Has the member been previously insured?"];
      delete memberToResubmit["RESIDENTIAL LOCATION"];
      delete memberToResubmit["WORK LOCATION"];
      delete memberToResubmit["EMPLOYEES SALARY BRACKET"];
      delete memberToResubmit["COMMISSION"];
      delete memberToResubmit["ENTITY CONTACT NUMBER"];
      delete memberToResubmit["ENTITY E-MAIL ID"];
    }
    const emiratesDB = await Database.from("emirates").distinct("name");
    let emirates = emiratesDB.map((a) => a.name);
    const nationalitiesDB = await Database.from("countries").distinct(
      "country_enName"
    );
    let nationalities = nationalitiesDB.map((a) => a.country_enName);
    const memberTypesDB = await Database.from("member_types").distinct("name");
    let memberTypes = memberTypesDB.map((a) => a.name);

    const entityTypesDB = await Database.from("entity_types").distinct("name");
    let entityTypes = entityTypesDB.map((a) => a.name);

    const establishmentIdsDB = await Database.from(
      "establishment_ids"
    ).distinct("name");
    let establishmentIds = establishmentIdsDB.map((a) => a.name);

    const residentialLocationsDB = await Database.from(
      "residential_locations"
    ).distinct("name");
    let residentialLocations = residentialLocationsDB.map((a) => a.name);

    const workLocationsDB = await Database.from("work_locations").distinct(
      "name"
    );
    let workLocations = workLocationsDB.map((a) => a.name);

    const employeesSalaryBracketsDB = await Database.from(
      "employees_salary_brackets"
    ).distinct("name");
    let employeesSalaryBrackets = employeesSalaryBracketsDB.map((a) => a.name);

    return view.render("endorsement/resubmit_a_member", {
      memberToResubmit: memberToResubmit,
      emirates: emirates,
      nationalities: nationalities,
      memberTypes: memberTypes,
      entityTypes: entityTypes,
      establishmentIds: establishmentIds,
      residentialLocations: residentialLocations,
      workLocations: workLocations,
      employeesSalaryBrackets: employeesSalaryBrackets,
      cor: cor,
      webReqId: memberToResubmitSession.web_req_id,
      master_account: memberToResubmitSession.master_account,
    });
  }
  async saveResubmittedMember({ auth, request, response }) {
    const insertedData = request.input("data");
    if (insertedData.dataDB && insertedData.dataDB != undefined) {
      await Database.from("resubmitted_insured_from_endorsement").insert(
        insertedData.dataDB
      );
      await Database.table("resubmitted_insured_from_endorsement")
        .where("web_req_id", insertedData.web_req_id)
        .where("Add_health_temp_id", insertedData.dataDB[0].Add_health_temp_id)
        .delete();
    }
    return response.redirect("myRequests");
  }
  //////////////start//////////////ADD A MEMBER//////////////start//////////////
  async addAMember({ view, auth, session }) {
    const webReqId = session.pull("webReqId");
    const distinctMaster = await getPolicies(auth.user.linked_user_id).distinct(
      "policies.master_account"
    );
    return view.render("endorsement/add_a_member", {
      master_accounts: distinctMaster,
    });
  }
  async getCORFromMaster({ request, auth }) {
    return await getPolicies(auth.user.linked_user_id)
      .distinct("policies.master_account")
      .distinct("policies.cor")
      .where("policies.master_account", request.input("master_account"));
  }
  async addAMember1({ view, auth, request, response, session }) {
    const master_account = request.body.master_account;
    const cor = request.body.cor;

    const contact = await Database.table("client_contact_details")
      .where("client_contact_id", auth.user.linked_user_id)
      .distinct("client_contact_name")
      .first();

    const policiesDB = await Database.select(
      "a.id",
      "a.master_policy_clover_id",
      "a.lob",
      "a.master_account",
      "a.profit_center_clover",
      "a.master_policy_supplier_id",
      "a.supplier",
      "a.currency",
      "a.cor",
      "a.subcat",
      "a.policyholder",
      "a.id"
    )
      .from("policies as a")
      .innerJoin("contact_links_tbl as b", function () {
        this.on("a.master_policy_clover_id", "b.master_policy_clover_id");
      })
      .where("b.client_contact_id", auth.user.linked_user_id)
      .where("a.cor", cor);

    let policies = policiesDB.map((a) => {
      return a.master_policy_clover_id;
    });
    const webReqIdDb = await Database.select("web_req_id")
      .from("add_health_temps")
      .orderBy("web_req_id", "desc")
      .first();

    const webReqIdDbError = await Database.select("web_req_id")
      .from("add_health_temp_errors")
      .orderBy("web_req_id", "desc")
      .first();

    let webReqNum = 0;
    if (webReqIdDb && webReqIdDbError) {
      webReqNum =
        webReqIdDb["web_req_id"] > webReqIdDbError["web_req_id"]
          ? webReqIdDb["web_req_id"]
          : webReqIdDbError["web_req_id"];
    } else if (webReqIdDb) {
      webReqNum = webReqIdDb["web_req_id"];
    } else if (webReqIdDbError) {
      webReqNum = webReqIdDbError["web_req_id"];
    } else {
      webReqNum = 0;
    }
    const webReqId = webReqNum + 1;
    session.put("webReqId", webReqId);

    const companyNameDB = await Database.from("contact_links_tbl")
      .where("client_contact_id", auth.user.linked_user_id)
      .distinct("client_cr_name");
    let companyName = companyNameDB.map((a) => a.client_cr_name);

    const emiratesDB = await Database.from("emirates").distinct("name");
    let emirates = emiratesDB.map((a) => a.name);

    const nationalitiesDB = await Database.from("countries").distinct(
      "country_enName"
    );
    let nationalities = nationalitiesDB.map((a) => a.country_enName);

    const memberTypesDB = await Database.from("member_types").distinct("name");
    let memberTypes = memberTypesDB.map((a) => a.name);

    const entityTypesDB = await Database.from("entity_types").distinct("name");
    let entityTypes = entityTypesDB.map((a) => a.name);

    const establishmentIdsDB = await Database.from(
      "establishment_ids"
    ).distinct("name");
    let establishmentIds = establishmentIdsDB.map((a) => a.name);

    const residentialLocationsDB = await Database.from(
      "residential_locations"
    ).distinct("name");
    let residentialLocations = residentialLocationsDB.map((a) => a.name);

    const workLocationsDB = await Database.from("work_locations").distinct(
      "name"
    );
    let workLocations = workLocationsDB.map((a) => a.name);

    const employeesSalaryBracketsDB = await Database.from(
      "employees_salary_brackets"
    ).distinct("name");
    let employeesSalaryBrackets = employeesSalaryBracketsDB.map((a) => a.name);

    const categoriesDB = await Database.from("policies_cats as a")
      .innerJoin("contact_links_tbl as b", function () {
        this.on("a.master_policy_clover_id", "b.master_policy_clover_id");
      })
      .where("b.client_contact_id", auth.user.linked_user_id)
      .where("a.based_on_limit", "No")
      .distinct("a.cat_name")
      .whereIn("a.master_policy_clover_id", policies);
    let categories = categoriesDB.map((a) => a.cat_name);

    const catBasedOnLimit = await Database.select(
      "a.id",
      "a.master_policy_clover_id",
      "a.cat_name",
      "a.limit_from",
      "a.limit_to",
      "a.based_on_limit",
      "b.client_cr_id",
      "b.client_cr_name",
      "b.client_contact_id"
    )
      .from("policies_cats as a")
      .innerJoin("contact_links_tbl as b", function () {
        this.on("a.master_policy_clover_id", "b.master_policy_clover_id");
      })
      .where("b.client_contact_id", auth.user.linked_user_id)
      .whereIn("a.master_policy_clover_id", policies)
      .where("a.based_on_limit", "Yes");

    return view.render("endorsement/add_a_member_1", {
      companyName: companyName,
      emirates: emirates,
      nationalities: nationalities,
      memberTypes: memberTypes,
      entityTypes: entityTypes,
      establishmentIds: establishmentIds,
      residentialLocations: residentialLocations,
      workLocations: workLocations,
      employeesSalaryBrackets: employeesSalaryBrackets,
      policies: policiesDB,
      master_account: master_account,
      client_contact_name: contact,
      client_contact_id: auth.user.linked_user_id,
      cor: cor,
      webReqId: webReqId,
      categories: categories,
      catBasedOnLimit: catBasedOnLimit,
    });
  }
  async addAMember2({ view, request, session, auth }) {
    const insertedData = request.input("data");
    const HOTcols = JSON.parse(request.input("HOTcols"));
    await Database.from("add_health_log").insert(insertedData.dataDB);
    let tableHeaders = [];
    let validContent = [];
    let invalidContent = [];
    if (insertedData.validEntries) {
      insertedData.validEntries.forEach(function (validEntry, index) {
        let validEntryNewArray = [];
        tableHeaders.length = 0;
        validEntry.reverse().map(function (entry, index) {
          tableHeaders.push(entry.prop);
          validEntryNewArray.push(entry.value);
        });
        validContent.push(validEntryNewArray);
      });
    }
    if (insertedData.invalidEntries) {
      insertedData.invalidEntries.forEach(function (invalidEntry, index) {
        let invalidEntryNewArray = [];
        tableHeaders.length = 0;
        invalidEntry.reverse().map(function (entry, index) {
          tableHeaders.push(entry.prop);
          invalidEntryNewArray.push(entry.value);
        });
        invalidContent.push(invalidEntryNewArray);
      });
    }
    const policiesDB = await getPolicies(auth.user.linked_user_id)
      .where("policies.cor", insertedData.cor)
      .distinct("policies.master_policy_clover_id");
    let policies = policiesDB.map((a) => a.master_policy_clover_id);

    const contact = await Database.table("client_contact_details")
      .where("client_contact_id", auth.user.linked_user_id)
      .distinct("client_contact_name")
      .first();

    const companyNameDB = await Database.from("contact_links_tbl")
      .where("client_contact_id", auth.user.linked_user_id)
      .distinct("client_cr_name");
    let companyName = companyNameDB.map((a) => a.client_cr_name);

    const emiratesDB = await Database.from("emirates").distinct("name");
    let emirates = emiratesDB.map((a) => a.name);

    const nationalitiesDB = await Database.from("countries").distinct(
      "country_enName"
    );
    let nationalities = nationalitiesDB.map((a) => a.country_enName);

    const memberTypesDB = await Database.from("member_types").distinct("name");
    let memberTypes = memberTypesDB.map((a) => a.name);

    const entityTypesDB = await Database.from("entity_types").distinct("name");
    let entityTypes = entityTypesDB.map((a) => a.name);

    const establishmentIdsDB = await Database.from(
      "establishment_ids"
    ).distinct("name");
    let establishmentIds = establishmentIdsDB.map((a) => a.name);

    const residentialLocationsDB = await Database.from(
      "residential_locations"
    ).distinct("name");
    let residentialLocations = residentialLocationsDB.map((a) => a.name);

    const workLocationsDB = await Database.from("work_locations").distinct(
      "name"
    );
    let workLocations = workLocationsDB.map((a) => a.name);

    const employeesSalaryBracketsDB = await Database.from(
      "employees_salary_brackets"
    ).distinct("name");
    let employeesSalaryBrackets = employeesSalaryBracketsDB.map((a) => a.name);

    return view.render("endorsement/add_a_member_2", {
      webReqId: insertedData.web_req_id,
      tableHeaders: tableHeaders,
      validContent: validContent,
      invalidContent: invalidContent,
      companyName: companyName,
      emirates: emirates,
      nationalities: nationalities,
      memberTypes: memberTypes,
      entityTypes: entityTypes,
      establishmentIds: establishmentIds,
      residentialLocations: residentialLocations,
      workLocations: workLocations,
      employeesSalaryBrackets: employeesSalaryBrackets,
      client_contact_id: auth.user.linked_user_id,
      invalidDetails: insertedData.invalidEntries,
      policies: policies,
      client_contact_name: contact,
      HOTcols: HOTcols,
    });
  }
  async addAMember3({ view, auth, request, response, session }) {
    const insertedData = request.input("data");
    let submittedEntries = [];
    if (insertedData.dataValid && insertedData.dataValid != undefined) {
      insertedData.dataValid.forEach((a, index) => {
        a.dob = "2000-10-10";
        console.log(a.dob);
      });
      await Database.from("add_health_temps_step2").insert(
        insertedData.dataValid
      );
    }
    console.log(insertedData.dataValid);
    if (
      insertedData.dataValidCategories &&
      insertedData.dataValidCategories != undefined
    ) {
      const policiesCats = await Database.from("policies_cats");
      insertedData.dataValidCategories.forEach((a, index) => {
        a.date = new Date();
        policiesCats.forEach((policyCat) => {
          if (a.policy_id === policyCat.master_policy_clover_id) {
            if (a.cat > policyCat.limit_from && a.cat < policyCat.limit_to) {
              a.limits = a.cat;
              a.cat = policyCat.cat_name;
            }
          }
        });
      });
      await Database.from("add_health_temp_cats_step2").insert(
        insertedData.dataValidCategories
      );
    }
    if (insertedData.dataInvalid && insertedData.dataInvalid != undefined) {
      await Database.from("add_health_temp_errors").insert(
        insertedData.dataInvalid
      );
    }
    if (
      insertedData.dataCategories &&
      insertedData.dataCategories != undefined
    ) {
      await Database.from("add_health_temp_error_cats").insert(
        insertedData.dataCategories
      );
    }
    const webReqId = session.get("webReqId");

    await Database.table("add_health_log")
      .where("web_req_id", webReqId)
      .delete();
    if (insertedData.dataValid) {
      insertedData.dataValid.forEach((a) => {
        submittedEntries.push({
          first_name: a.first_name,
          last_name: a.last_name,
          dob: a.dob,
          company_name: a.company_name,
        });
      });
    }
    return view.render("endorsement/add_a_member_3", {
      submittedEntries: submittedEntries,
      cor: insertedData.cor,
    });
  }
  async step3Upload({ request, response, session }) {
    const webReqId = session.get("webReqId");
    console.log(webReqId);
    const addHealthTemps = await Database.from("add_health_temps_step2").where(
      "web_req_id",
      webReqId
    );
    addHealthTemps.map(function (e) {
      delete e.id;
      return e;
    });
    const addHealthTempCats = await Database.select(
      "policy_id",
      "cat",
      "Add_health_temp_id",
      "web_req_id",
      "limits",
      "lob",
      "person_id",
      "status",
      "status_update",
      "date"
    )
      .from("add_health_temp_cats_step2")
      .where("web_req_id", webReqId);
    if (addHealthTemps && addHealthTempCats) {
      console.log("ffffffffffff", addHealthTemps);
      await Database.from("add_health_temps").insert(addHealthTemps);
      await Database.from("add_health_temp_cats").insert(addHealthTempCats);
      await Database.from("add_health_temps_step2")
        .where("web_req_id", webReqId)
        .delete();
      await Database.from("add_health_temp_cats_step2")
        .where("web_req_id", webReqId)
        .delete();
      // await Axios({
      //   method: "post",
      //   url: "http://10.0.0.7:3002/api/v1/addHealthTempCat",
      //   data: {
      //     AddHealthTemp: addHealthTemps,
      //     AddHealthTempCat: addHealthTempCats,
      //   },
      // })
      //   .then((res) => {
      //     session.flash({ notification: "Update successful!" });
      //     return response.redirect("back");
      //   })
      //   .catch((error) => {
      //     console.log("ApiController", error.response.data);
      //   });
    }

    const profilePics = request.file("profile_pics", {
      types: ["image", "pdf"],
      size: "2mb",
      extnames: ["jpeg", "jpg", "bmp", "gif", "png", "pdf", "tiff", "tif"],
    });
    let fileArray = [];
    if (profilePics) {
      await profilePics.moveAll(
        Helpers.tmpPath("uploads/endorsementDocs/add_health_temps/" + webReqId),
        (file) => {
          const fileName = `${new Date().getTime()}.${file.subtype}`;
          fileArray.push({
            name: fileName,
            web_req_id: webReqId,
          });
          return {
            name: fileName,
          };
        }
      );

      if (!profilePics.movedAll()) {
        return profilePics.errors();
      }
      await Database.from("add_health_temp_files").insert(fileArray);
      return response.redirect("myRequests");
    }
  }
  async loader({ view, session }) {
    session.flash({
      notification: "You have successfully created an endorsement request",
    });
    return view.render("endorsement/loader");
  }
  //////////////start//////////////DELETE A MEMBER//////////////start//////////////
  async deleteAMember({ view, auth, session }) {
    const master_accounts = await getPolicies(
      auth.user.linked_user_id
    ).distinct("policies.master_account");
    return view.render("endorsement/delete_a_member", {
      master_accounts: master_accounts,
    });
  }
  async deleteAMember1({ view, auth, request }) {
    const cor = request.body.cor;
    const step = request.body.step;
    const masterPolicyCloverIdDb = await Database.select(
      "master_policy_clover_id"
    )
      .from("policies")
      .where("cor", cor);
    let masterPolicyCloverId = masterPolicyCloverIdDb.map(
      (a) => a.master_policy_clover_id
    );

    if (step == 1) {
      let updatedUidDb = await Database.table("updated_iid as a")
        .innerJoin("contact_links_tbl as b", function () {
          this.on("a.master_policy_clover_id", "b.master_policy_clover_id");
        })
        .where("b.client_contact_id", auth.user.linked_user_id)
        .whereIn("a.master_policy_clover_id", masterPolicyCloverId)
        .where("relation", "1= PRINCIPAL")
        .distinct("a.first_name")
        .distinct("a.last_name")
        .distinct("a.staff_id");

      return view.render("endorsement/delete_a_member_1", {
        memberFromCensus: updatedUidDb,
      });
    } else {
      const membersFromPrincipal = request.body.data;
      const staffIds = request.body.data;
      const allMembersFromCensus = await Database.table("updated_iid")
        .whereIn("staff_id", staffIds)
        .distinct("first_name")
        .distinct("last_name")
        .distinct("staff_id")
        .distinct("relation")
        .distinct("company_name")
        .distinct("dob")
        .orderBy("staff_id", "asc")
        .orderBy("relation", "asc");
      return view.render("endorsement/delete_a_member_2", {
        allMembersFromCensus: allMembersFromCensus,
      });
    }
  }
  async deleteAMember3({ request, view, session }) {
    const checkedMembersToDelete = request.input("data");
    let staffIds = [];
    let firstName = [];
    let lastName = [];
    let today = new Date();
    let membersToDelete = [];
    if (checkedMembersToDelete) {
      checkedMembersToDelete.forEach(function (entryToDelete, index) {
        staffIds.push(entryToDelete.staff_id);
        firstName.push(entryToDelete.first_name);
        lastName.push(entryToDelete.last_name);
      });
      membersToDelete = await Database.table("updated_iid")
        .whereIn("staff_id", staffIds)
        .whereIn("first_name", firstName)
        .whereIn("last_name", lastName);

      const lastWebReqIdDb = await Database.table("delete_health_temps")
        .orderBy("web_req_id", "desc")
        .distinct("web_req_id")
        .first();
      let lastWebReqId =
        lastWebReqIdDb == undefined || lastWebReqIdDb.web_req_id === null
          ? 0
          : lastWebReqIdDb.web_req_id;
      const webReqId = lastWebReqId + 1;

      checkedMembersToDelete.forEach(function (entryFromWeb, index) {
        membersToDelete.forEach(function (entryFromDb, index) {
          if (
            entryFromWeb.staff_id == entryFromDb.staff_id &&
            entryFromWeb.first_name == entryFromDb.first_name &&
            entryFromWeb.last_name == entryFromDb.last_name
          ) {
            entryFromDb.reason = entryFromWeb.reason;
            entryFromDb.date_deleted = today;
            entryFromDb.web_req_id = webReqId;
            delete entryFromDb.id;
          }
        });
      });
    }

    await Database.from("delete_health_temps").insert(membersToDelete);
    session.put("dataToDelete", membersToDelete);
    return view.render("endorsement/delete_a_member_3", {
      cor: checkedMembersToDelete.cor,
      deletedMembers: membersToDelete,
    });
  }
  async deleteAMember3Upload({ auth, request, response, session }) {
    const dataToDelete = session.pull("dataToDelete");
    await Database.from("delete_health_temps").insert(dataToDelete);

    const profilePics = request.file("profile_pics", {
      types: ["image", "pdf"],
      size: "2mb",
      extnames: ["jpeg", "jpg", "bmp", "gif", "png", "pdf", "tiff", "tif"],
    });
    let fileArray = [];
    if (profilePics) {
      await profilePics.moveAll(
        Helpers.tmpPath(
          "uploads/endorsementDocs/delete_health_temps/" +
            auth.user.linked_user_id
        ),
        (file) => {
          const fileName = `${new Date().getTime()}.${file.subtype}`;
          fileArray.push({
            name: fileName,
            client_contact_id: auth.user.linked_user_id,
          });
          return {
            name: fileName,
          };
        }
      );

      if (!profilePics.movedAll()) {
        return profilePics.errors();
      }
      await Database.from("delete_health_temp_files").insert(fileArray);
      return response.redirect("census");
    }
  }
  //////////////start//////////////CENSUS//////////////start//////////////
  async census({ view, auth, session }) {
    const master_accounts = await getPolicies(
      auth.user.linked_user_id
    ).distinct("master_account");
    return view.render("endorsement/census", {
      master_accounts: master_accounts,
    });
  }
  async censusList({ view, auth, request }) {
    const master_account = request.body.master_account;
    const cor = request.body.cor;

    const masterPolicyCloverIdDb = await Database.select(
      "master_policy_clover_id"
    )
      .from("policies")
      .where("master_account", master_account)
      .where("cor", cor);
    let masterPolicyCloverId = masterPolicyCloverIdDb.map(
      (a) => a.master_policy_clover_id
    );

    let updatedUidDb = await Database.table("updated_iid")
      .innerJoin("contact_links_tbl", function () {
        this.on(
          "updated_iid.master_policy_clover_id",
          "contact_links_tbl.master_policy_clover_id"
        );
      })
      .where("contact_links_tbl.client_contact_id", auth.user.linked_user_id)
      .whereIn("updated_iid.master_policy_clover_id", masterPolicyCloverId)
      .distinct("updated_iid.master_policy_clover_id")
      .distinct("updated_iid.uid")
      .distinct("updated_iid.cat");

    const distinctUidDb = await Database.table("updated_iid")
      .innerJoin("contact_links_tbl", function () {
        this.on(
          "updated_iid.master_policy_clover_id",
          "contact_links_tbl.master_policy_clover_id"
        );
      })
      .where("contact_links_tbl.client_contact_id", auth.user.linked_user_id)
      .whereIn("updated_iid.master_policy_clover_id", masterPolicyCloverId)
      .distinct("updated_iid.uid");
    let distinctUid = distinctUidDb.map((a) => a.uid);

    const uidData = await Database.from("uid").whereIn("uid", distinctUid);

    return view.render("endorsement/census_list", {
      uidData: uidData,
      policiesDb: masterPolicyCloverIdDb,
      updatedUidDb: updatedUidDb,
    });
  }

  //////////////////////////////////////////NOT USED ANYMORE/////////////////////////////////
  async deletion({ view }) {
    return view.render("endorsement/deletion");
  }
  async addCategory({ request, response }) {
    const catInserted = await Database.table("add_health_temp_cats").insert({
      Add_health_temp_id: request.input("addHealthTempId"),
      policy_id: request.input("master_policy_clover_id"),
      cat: request.input("category"),
    });
  }

  sendEmailStatus({ request, response }) {
    // send confirmation emailg

    sgMail.setApiKey(Env.get("SENDGRID_API_KEY"));
    const msg = {
      //to: request.input("email"),
      to: "master_account@gmail.com",
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
  }
}
module.exports = EndorsementController;
