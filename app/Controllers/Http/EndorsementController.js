"use strict";
const User = use("App/Models/User");
const Database = use("Database");
const Env = use("Env");

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
  async myRequests({ view }) {
    return view.render("endorsement/my_requests");
  }
  async addAMember({ view, auth }) {
    const contact = await Database.table("policies")
      .where("contactid", auth.user.linked_user_id)
      .distinct("contact")
      .first();
    const masters = await Database.table("policies")
      .where("contactid", auth.user.linked_user_id)
      .distinct("master");
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
      contact: contact.contact,
      masters: masters,
      emirates: emirates,
      nationalities: nationalities,
      memberTypes: memberTypes,
      entityTypes: entityTypes,
      establishmentIds: establishmentIds,
      residentialLocations: residentialLocations,
      workLocations: workLocations,
      employeesSalaryBrackets: employeesSalaryBrackets,
    });
  }
  async addAMemberStep3({ view, session, auth }) {
    const step2Data = session.get("step2Data");
    const policiesDB = await Database.table("policies")
      .where("contactid", auth.user.linked_user_id)
      .distinct("policyid");
    let policies = policiesDB.map((a) => a.policyid);

    return view.render("endorsement/add_a_member_step3", {
      step2Data: step2Data,
      policies: policies,
    });
  }
  async addAMemberStep4({ view, session, auth }) {
    const step2Data = session.get("step2Data");
    return view.render("endorsement/add_a_member_step4", {
      step2Data: step2Data,
    });
  }
  async addCategory({ request, response }) {
    console.log(request.body);
    const catInserted = await Database.table("add_health_temp_cats").insert({
      Add_health_temp_id: request.input("addHealthTempId"),
      policy_id: request.input("policyid"),
      cat: request.input("category"),
    });
  }
  async getCORFromMaster({ request, response }) {
    const COR = await Database.table("policies")
      .distinct("country")
      .where("master", request.input("master"));
    return COR;
  }

  async saveMember({ request, response, session }) {
    session.forget("step2Data");
    const insertedData = request.input("data");
    session.put("step2Data", insertedData);
    const firstUserId = await Database.from("add_health_temps").insert(
      insertedData
    );
    return "Data Added Successfully";
  }

  async deletion({ view }) {
    return view.render("endorsement/deletion");
  }
}

module.exports = EndorsementController;
