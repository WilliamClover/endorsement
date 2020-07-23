"use strict";

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use("Route");

Route.on("/").render("home").as("home").middleware(["auth"]);

//AUTHENTICATION// middleware authenticated to check if user is loggedin redirect to home
Route.get("register", "Auth/RegisterController.showRegister").middleware([
  "authenticated",
]);
Route.post("register", "Auth/RegisterController.register").as("register");

Route.get("register2", "Auth/RegisterController.showRegister2").middleware([
  "authenticated",
]);
Route.post("register2", "Auth/RegisterController.register2").as("register2");

Route.get("register3", "Auth/RegisterController.showRegister3").middleware([
  "authenticated",
]);
Route.post("register3", "Auth/RegisterController.register3").as("register3");

Route.get("register4", "Auth/RegisterController.showRegister4").middleware([
  "authenticated",
]);

Route.get("register/confirm/:token", "Auth/RegisterController.confirmEmail");
//REGISTRATION end//
//LOGIN start//
Route.get("login", "Auth/LoginController.showLogin").middleware([
  "authenticated",
]);
Route.post("login", "Auth/LoginController.login").as("login");
Route.get("login2", "Auth/LoginController.showLogin2").middleware([
  "authenticated",
]);
Route.post("login2", "Auth/LoginController.login2").as("login2");
Route.get("loginOTP", "Auth/LoginController.loginOTP");
Route.post("verifyloginOTP", "Auth/LoginController.verifyloginOTP").as(
  "verifyloginOTP"
);
Route.get("verifyAuthy", "Auth/LoginController.showVerifyAuthy").middleware([
  "authenticated",
]);
Route.post("verifyAuthy", "Auth/LoginController.verifyAuthy").as("verifyAuthy");
Route.post("verifyloginAuthy", "Auth/LoginController.verifyloginAuthy").as(
  "verifyloginAuthy"
);
//LOGIN end//
Route.get("logout", "Auth/AuthenticatedController.logout");
Route.get(
  "password/reset",
  "Auth/PasswordResetController.showLinkRequestForm"
).middleware(["authenticated"]);
Route.post(
  "password/email",
  "Auth/PasswordResetController.sendResetLinkEmail"
).middleware(["authenticated"]);
Route.get(
  "password/reset/:token",
  "Auth/PasswordResetController.showResetForm"
).middleware(["authenticated"]);
Route.post("password/reset", "Auth/PasswordResetController.reset").middleware([
  "authenticated",
]);
//ADMINISTRATION// middleware userIsAdmin to check if user is admin or redirect to home
Route.get(
  "admin/registered/",
  "Admin/RegisteredListController.showUsersList"
).middleware(["userIsAdmin"]);
Route.post("admin/activateUser/", "Admin/RegisteredListController.activateUser")
  .middleware(["userIsAdmin"])
  .as("activateUser");
Route.post("admin/deleteUser/", "Admin/RegisteredListController.deleteUser")
  .middleware(["userIsAdmin"])
  .as("deleteUser");
Route.post("admin/linkUser/", "Admin/RegisteredListController.linkUser")
  .middleware(["userIsAdmin"])
  .as("linkUser");
Route.post("admin/unlinkUser/", "Admin/RegisteredListController.unlinkUser")
  .middleware(["userIsAdmin"])
  .as("unlinkUser");

Route.get("endorsement/myPolicies", "EndorsementController.myPolicies");

Route.get("endorsement/myRequests", "EndorsementController.myRequests");

Route.post(
  "endorsement/deleteRejectedPerson",
  "EndorsementController.deleteRejectedPerson"
).as("deleteRejectedPerson");
Route.post(
  "endorsement/resubmitRejectedPerson",
  "EndorsementController.resubmitRejectedPerson"
).as("resubmitRejectedPerson");
Route.post(
  "endorsement/saveResubmittedMember",
  "EndorsementController.saveResubmittedMember"
).as("saveResubmittedMember");

Route.get(
  "endorsement/showResubmitRejectedPerson",
  "EndorsementController.showResubmitRejectedPerson"
).as("showResubmitRejectedPerson");

/////////////start/////////////CENSUS/////////////start/////////////
Route.get("endorsement/census", "EndorsementController.census");
Route.post("endorsement/censusList", "EndorsementController.censusList").as(
  "censusList"
);
/////////////end/////////////CENSUS/////////////end/////////////

/////////////start/////////////ADD A MEMBER/////////////start/////////////
Route.get(
  "endorsement/getCORFromMaster",
  "EndorsementController.getCORFromMaster"
).as("getCORFromMaster");
Route.get("endorsement/addAMember", "EndorsementController.addAMember");
Route.post("endorsement/addAMember1", "EndorsementController.addAMember1").as(
  "addAMember1"
);
Route.post("endorsement/addAMember2", "EndorsementController.addAMember2").as(
  "addAMember2"
);
Route.post("endorsement/addAMember3", "EndorsementController.addAMember3").as(
  "addAMember3"
);
Route.post("endorsement/step3Upload", "EndorsementController.step3Upload").as(
  "step3Upload"
);
/////////////end/////////////ADD A MEMBER/////////////end/////////////

/////////////start/////////////DELETE A MEMBER/////////////start/////////////
Route.get("endorsement/deleteAMember", "EndorsementController.deleteAMember");
Route.post(
  "endorsement/tableTodelete",
  "EndorsementController.tableTodelete"
).as("tableTodelete");
Route.post(
  "endorsement/deleteMemberFromDb",
  "EndorsementController.deleteMemberFromDb"
).as("deleteMemberFromDb");
Route.post(
  "endorsement/deleteAMember3Upload",
  "EndorsementController.deleteAMember3Upload"
).as("deleteAMember3Upload");
/////////////end/////////////DELETE A MEMBER/////////////end/////////////

Route.get(
  "endorsement/myCompletedRequests",
  "EndorsementController.myCompletedRequests"
);
Route.post(
  "endorsement/myCompletedRequestsDetails",
  "EndorsementController.myCompletedRequestsDetails"
).as("myCompletedRequestsDetails");

Route.get("endorsement/deletion", "EndorsementController.deletion");
Route.post("endorsement/addCategory", "EndorsementController.addCategory").as(
  "addCategory"
);

// APIs start
Route.put(
  "api/addHealthTempCats/:pid/:wid",
  "Api/ApiController.addHealthTempCats"
);
Route.post("api/test", "Api/ApiController.apiTest").as("apiTest");
// APIs end
