var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const { response } = require("express");
const saltRounds = 10;
const helpers = require("../helpers/util");

module.exports = function (db) {
  router.get("/", helpers.isLoggedIn, (req, res) => {
    let sql =
      "select members.userid as memberid, projects.name, users.firstname from members inner join projects on members.projectid = projects.projectid inner join users on members.userid = users.userid";
    db.query(sql, (err, data) => {
      if (err) {
        throw err;
      }
      res.render("projects/projects", { data: data.rows });
    });
  });

  router.post('/', helpers.isLoggedIn, (req, res) => {
      let id = req.body.id
      console.log(id)
  })

  return router;
};
