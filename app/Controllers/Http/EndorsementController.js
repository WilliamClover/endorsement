"use strict";
const User = use("App/Models/User");
const Database = use("Database");
const Env = use("Env");
const Helpers = use("Helpers");

class EndorsementController {
  async myPolicies({ view, auth }) {
    const policies = await Database.from("policies").where(
      "contactid",
      auth.user.linked_user_id
    );
    const distinctContacts = await Database.table("policies")
      .distinct("master")
      .where("contactid", auth.user.linked_user_id);
    return view.render("endorsement/my_policies", {
      policies: policies,
      distinctContacts: distinctContacts,
    });
  }
  async myCompletedRequests({ view, auth }) {
    const policiesFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .whereNot("endorsement_id", null)
      .distinct("policy_id");
    let policiesFromAddArray = policiesFromAddDb.map((a) => a.policy_id);
    const policiesFromAdd = await Database.table("policies")
      .where("contactid", auth.user.linked_user_id)
      .whereIn("policyid", policiesFromAddArray);
    const endorsIdFromAddDb = await Database.table("add_health_temp_cats")
      .where("person_id", auth.user.linked_user_id)
      .whereNot("endorsement_id", null);

    const policiesFromDeleteDb = await Database.table("census_to_delete")
      .where("person_id", auth.user.linked_user_id)
      .whereNot("endorsement_id", null)
      .distinct("policy_id");
    let policiesFromDeleteArray = policiesFromDeleteDb.map((a) => a.policy_id);
    const policiesFromDelete = await Database.table("policies")
      .where("contactid", auth.user.linked_user_id)
      .whereIn("policyid", policiesFromDeleteArray);
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
  async myCompletedRequestsDetails({ view, auth, request }) {
    const completedRequestData = request.body;
    if (completedRequestData.section == "add") {
      const web_req_id = completedRequestData.web_req_id;
      const Add_health_temp_id = completedRequestData.Add_health_temp_id;
      let completedRequests = await Database.table("add_health_temps")
        .where("contactid", auth.user.linked_user_id)
        .where("web_req_id", web_req_id)
        .where("Add_health_temp_id", Add_health_temp_id);
      return view.render("endorsement/my_completed_requests_details", {
        completedRequests: completedRequests,
        endorsement_id: completedRequestData.endorsement_id,
      });
    } else {
      const census_id = completedRequestData.census_id;
      let completedRequests = await Database.table("census").where(
        "id",
        census_id
      );
      return view.render("endorsement/my_completed_requests_details", {
        completedRequests: completedRequests,
        endorsement_id: completedRequestData.endorsement_id,
      });
    }
  }
  async myRequests({ view, auth }) {
    const contact = await Database.table("policies")
      .where("contactid", auth.user.linked_user_id)
      .distinct("contact")
      .first();
    const webReqIdDbOngoing = await Database.select(
      "add_health_temps.web_req_id"
    )
      .from("add_health_temps")
      .innerJoin("add_health_temp_cats", function () {
        this.on(
          "add_health_temp_cats.Add_health_temp_id",
          "add_health_temps.Add_health_temp_id"
        ).andOn(
          "add_health_temp_cats.web_req_id",
          "add_health_temps.web_req_id"
        );
      })
      .where("add_health_temps.contact", contact.contact)
      .where("add_health_temp_cats.status", "ongoing")
      .distinct("add_health_temp_cats.web_req_id");
    let webReqIdDbOngoingArray = webReqIdDbOngoing.map((a) => a.web_req_id);

    const policyOngoingIdDb = await Database.select(
      "policy_id",
      "Add_health_temp_id",
      "web_req_id"
    )
      .from("add_health_temp_cats")
      .whereIn("web_req_id", webReqIdDbOngoingArray);
    const ongoingRequests = await Database.table("add_health_temps").where(
      "contact",
      contact.contact
    );

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
    return view.render("endorsement/my_requests", {
      policyOngoingIdDb: policyOngoingIdDb,
      webReqIdDbOngoing: webReqIdDbOngoing,
      ongoingRequests: ongoingRequests,
      personDbRejected: personDbRejected,
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
      master: memberToResubmitSession.master,
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
  async getCORFromMaster({ request, response }) {
    const COR = await Database.table("policies")
      .distinct("country")
      .where("master", request.input("master"));
    return COR;
  }
  async addAMember({ view, auth, session }) {
    const masters = await Database.table("policies")
      .where("contactid", auth.user.linked_user_id)
      .distinct("master");
    return view.render("endorsement/add_a_member", {
      masters: masters,
    });
  }
  async addAMember1({ view, auth, request, response, session }) {
    const master = request.body.master;
    const cor = request.body.cor;

    const contact = await Database.table("policies")
      .where("contactid", auth.user.linked_user_id)
      .distinct("contact")
      .first();
    const policiesDB = await Database.table("policies")
      .where("contactid", auth.user.linked_user_id)
      .where("country", cor);
    let policies = policiesDB.map((a) => a.policyid);
    session.forget("webReqId");
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
      if (webReqIdDb > webReqIdDbError) webReqNum = webReqIdDb["web_req_id"];
      else webReqNum = webReqIdDbError["web_req_id"];
    } else if (webReqIdDb) {
      webReqNum = webReqIdDb["web_req_id"];
    } else if (webReqIdDbError) {
      webReqNum = webReqIdDbError["web_req_id"];
    }
    const webReqId = webReqNum + 1;
    session.put("webReqId", webReqId);

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

    return view.render("endorsement/add_a_member_1", {
      emirates: emirates,
      nationalities: nationalities,
      memberTypes: memberTypes,
      entityTypes: entityTypes,
      establishmentIds: establishmentIds,
      residentialLocations: residentialLocations,
      workLocations: workLocations,
      employeesSalaryBrackets: employeesSalaryBrackets,
      policies: policiesDB,
      master: master,
      contact: contact,
      cor: cor,
      webReqId: webReqId,
    });
  }
  async addAMember2({ view, request, session, auth }) {
    const insertedData = request.input("data");

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
    const policiesDB = await Database.table("policies")
      .where("contactid", auth.user.linked_user_id)
      .where("country", insertedData.cor)
      .distinct("policyid");
    let policies = policiesDB.map((a) => a.policyid);

    const contact = await Database.table("policies")
      .where("contactid", auth.user.linked_user_id)
      .distinct("contact")
      .first();

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
      emirates: emirates,
      nationalities: nationalities,
      memberTypes: memberTypes,
      entityTypes: entityTypes,
      establishmentIds: establishmentIds,
      residentialLocations: residentialLocations,
      workLocations: workLocations,
      employeesSalaryBrackets: employeesSalaryBrackets,

      invalidDetails: insertedData.invalidEntries,
      policies: policies,
      contact: contact,
    });
  }
  async addAMember3({ view, auth, request, response, session }) {
    const insertedData = request.input("data");
    let submittedEntries = [];

    if (insertedData.dataValid && insertedData.dataValid != undefined) {
      await Database.from("add_health_temps").insert(insertedData.dataValid);
    }
    if (
      insertedData.dataValidCategories &&
      insertedData.dataValidCategories != undefined
    ) {
      await Database.from("add_health_temp_cats").insert(
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

    const validEntriesDB = await Database.select(
      "first_name",
      "last_name",
      "company_name"
    )
      .from("add_health_temps")
      .where("web_req_id", webReqId);
    if (validEntriesDB.length > 0) {
      validEntriesDB.forEach((a) => {
        submittedEntries.push({
          first_name: a.first_name,
          last_name: a.last_name,
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
    const webReqId = session.pull("webReqId");
    const profilePics = request.file("profile_pics", {
      types: ["image"],
      size: "2mb",
    });
    let fileArray = [];
    if (profilePics) {
      await profilePics.moveAll(
        Helpers.tmpPath("uploads/endorsementDocs"),
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

  //////////////start//////////////DELETE A MEMBER//////////////start//////////////
  async deleteAMember({ view, auth, session }) {
    const masters = await Database.table("policies")
      .where("contactid", auth.user.linked_user_id)
      .distinct("master");
    return view.render("endorsement/delete_a_member", {
      masters: masters,
    });
  }
  async tableTodelete({ view, auth, request }) {
    const cor = request.body.cor;
    const step = request.body.step;
    if (step == 1) {
      const memberFromCensus = await Database.table("census")
        .where("contact", auth.user.linked_user_id)
        .where("cor", cor)
        .where("relation", "1= PRINCIPAL");
      return view.render("endorsement/delete_a_member_1", {
        memberFromCensus: memberFromCensus,
      });
    } else {
      const membersFromPrincipal = request.body.data;
      const principalIds = request.body.data;
      const allMembersFromCensus = await Database.table("census")
        .where("contact", auth.user.linked_user_id)
        .where("cor", cor)
        .whereIn("principal_id", principalIds)
        .orderBy("principal_id", "asc")
        .orderBy("relation", "asc");
      return view.render("endorsement/delete_a_member_2", {
        allMembersFromCensus: allMembersFromCensus,
      });
    }
  }
  async deleteMemberFromDb({ auth, request, view }) {
    const checkedMembersToDelete = request.input("data");
    let idOfCensus = [];
    let dataToInsert = [];
    let today = new Date().toLocaleDateString();

    if (checkedMembersToDelete) {
      checkedMembersToDelete.forEach(function (entryToDelete, index) {
        idOfCensus.push(entryToDelete.id);
      });
    }
    const memberFromCensus = await Database.table("census").whereIn(
      "id",
      idOfCensus
    );
    if (memberFromCensus) {
      memberFromCensus.forEach(function (detailsToDelete, index) {
        dataToInsert.push({
          web_req_id: detailsToDelete.web_req_id,
          census_id: detailsToDelete.id,
          category: detailsToDelete.category,
          reason: checkedMembersToDelete[index].reason,
          date_of_request: today,
        });
      });
    }
    await Database.from("census_to_delete").insert(dataToInsert);
    //return console.log("idOfCensus", dataToInsert);
    return view.render("endorsement/delete_a_member_3", {
      cor: checkedMembersToDelete.cor,
      deleteMember: dataToInsert,
    });
  }
  async deleteAMember3Upload({ request, response, session }) {
    //const webReqId = session.pull("webReqId");
    const webReqId = 0;
    const profilePics = request.file("profile_pics", {
      types: ["image"],
      size: "2mb",
    });
    let fileArray = [];
    if (profilePics) {
      await profilePics.moveAll(
        Helpers.tmpPath("uploads/endorsementDocs/delete_member"),
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
      await Database.from("census_to_delete_files").insert(fileArray);
      return response.redirect("census");
    }
  }
  //////////////start//////////////CENSUS//////////////start//////////////
  async census({ view, auth, session }) {
    const masters = await Database.table("policies")
      .where("contactid", auth.user.linked_user_id)
      .distinct("master");
    return view.render("endorsement/census", {
      masters: masters,
    });
  }
  async censusList({ view, auth, request }) {
    const master = request.body.master;
    const cor = request.body.cor;
    const censusDb = await Database.table("census")
      .where("contact", auth.user.linked_user_id)
      .where("master", master)
      .where("cor", cor);
    const policiesDb = await Database.table("policies")
      .where("contactid", auth.user.linked_user_id)
      .where("master", master)
      .where("country", cor);
    const policiesCatsDb = await Database.table("policies_cats");
    return view.render("endorsement/census_list", {
      censusEntries: censusDb,
      policiesDb: policiesDb,
      policiesCatsDb: policiesCatsDb,
    });
  }

  //////////////////////////////////////////NOT USED ANYMORE/////////////////////////////////
  async deletion({ view }) {
    return view.render("endorsement/deletion");
  }
  async addCategory({ request, response }) {
    const catInserted = await Database.table("add_health_temp_cats").insert({
      Add_health_temp_id: request.input("addHealthTempId"),
      policy_id: request.input("policyid"),
      cat: request.input("category"),
    });
  }
}

module.exports = EndorsementController;
