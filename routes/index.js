var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const { response } = require("express");
const saltRounds = 10;
const helpers = require("../helpers/util");

module.exports = function (db) {


  router.get("/", (req, res) => {
    res.render("login", {info: req.flash('info')});
  });

  router.post("/login", (req, res) => {
    db.query(
      "select * from users where email = $1",
      [req.body.email],
      (err, data) => {
        if (err) {
          req.flash("info", "something wrong");
          return res.redirect("/");
        }
        if (data.rows.length == 0) {
          req.flash("info", "email or password wrong");
          return res.redirect("/");
        }

        bcrypt.compare(
          req.body.password,
          data.rows[0].password,
          function (err, result) {
            if (result) {
              req.session.user = data.rows[0];
              res.redirect("/projects");
            } else {
              req.flash("info", "email or password wrong");
              res.redirect("/");
            }
          }
        );
      }
    );
  });

  router.get("/logout", (req, res, next) => {
    req.session.destroy(function (err) {
      res.redirect("/");
    });
  });

  return router;
};
