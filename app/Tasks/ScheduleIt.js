"use strict";
const Database = use("Database");
const xlsx = use("xlsx");
const fs = use("fs");
const Task = use("Task");
//find schedule job from here >>>>> https://codelike.pro/schedule-jobs-crontab-like-in-an-adonisjs-app/
class ScheduleIt extends Task {
  static get schedule() {
    return "30 16 * * *";
  }

  async handle() {
    const currentdate = new Date();
    let datetime =
      currentdate.getDate() +
      "-" +
      (currentdate.getMonth() + 1) +
      "-" +
      currentdate.getFullYear() +
      " " +
      currentdate.getHours() +
      ":" +
      currentdate.getMinutes() +
      ":" +
      currentdate.getSeconds();

    fs.readdir("public/xslx/", function (err, files) {
      if (err) {
        console.log(err);
        return;
      }
      if (files.length > 0) {
        console.log(files);
        files.forEach(async function (fname) {
          const wb = xlsx.readFile("public/xslx/" + fname);
          const ws = wb.Sheets["Sheet1"];
          const data = xlsx.utils.sheet_to_json(ws);
          let validData = [];
          let invalidData = [];
          data.forEach((d) => {
            var hasNumber = /\d/;
            var isNumber = /^\d+$/;

            d["created_at"] = datetime;
            if (d.company_name == undefined || d.s_department == undefined || d.first_name == undefined ||
              d.last_name == undefined || d.relation == undefined || d.dob == undefined || d.gender == undefined ||
              d.nationality == undefined || d.marital_status == undefined || d.cost_sharing == undefined ||
              d.mobile == undefined || d.email == undefined) {
              console.log("1")
              invalidData.push(d);
            } else if (d.employee_staff_id != undefined && d.employee_staff_id.length < 2) {
              invalidData.push(d);
              console.log("2")
            } else if (hasNumber.test(d.first_name) == true || d.first_name.length < 2) {
              invalidData.push(d);
              console.log("3")
            } else if (d.second_name != undefined && (hasNumber.test(d.second_name) == true || d.second_name.length < 2)) {
              invalidData.push(d);
              console.log("4")
            } else if (hasNumber.test(d.last_name) == true || d.last_name.length < 2) {
              invalidData.push(d);
              console.log("5")
            } else if (d.position != undefined && d.position.length < 3) {
              invalidData.push(d);
              console.log("6")
            } else if (d.grade != undefined && isNumber.test(d.grade) != true) {
              invalidData.push(d);
              console.log("7")
            } else {
              validData.push(d);
              console.log("0")
            }
          });
          await Database.table("add_health_temps").insert(validData);
          await Database.table("add_health_temp_errors").insert(invalidData);
        });

        // return response.json(data);
      } else {
        console.log("no files");
      }
    });
  }
}

module.exports = ScheduleIt;
