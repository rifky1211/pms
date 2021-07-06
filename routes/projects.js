var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const { response } = require("express");
const saltRounds = 10;
const helpers = require("../helpers/util");

module.exports = function (db) {
  router.get("/", helpers.isLoggedIn, (req, res) => {
    const url = req.url == "/" ? "/projects/?page=1" : req.url;
    const findName = req.query.findName;
    const findId = parseInt(req.query.findId);
    const findMember = parseInt(req.query.findMember);
    var page = parseInt(req.query.page) || 1;
    var size = 2;
    var offset = (page - 1) * size;
    let params = [];
    console.log(url);
    if (findId) {
      params.push(`projects.projectid = ${findId}`);
    }
    if (findName) {
      params.push(`projects.name ilike '%${findName}%'`);
    }
    if (findMember) {
      params.push(`members.userid = ${findMember}`);
    }

    let sql = `select projects.projectid, projects.name, ARRAY_AGG(' ' || users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) group by projects.projectid, projects.name order by projects.projectid limit 2 offset 0;`;

    let sqlCount =
      "select projects.projectid, projects.name, ARRAY_AGG(' ' || users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) group by projects.projectid, projects.name order by projects.projectid;";

    if(page){
      sql = `select projects.projectid, projects.name, ARRAY_AGG(' ' || users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) group by projects.projectid, projects.name order by projects.projectid limit 2 offset ${offset};`
    }

    if (params.length > 0) {
      sql =
        "select projects.projectid, projects.name, ARRAY_AGG(' ' || users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid)";
      sqlCount =
        "select projects.projectid, projects.name, ARRAY_AGG(' ' || users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid)";
      sql += ` where ${params.join(
        " and "
      )} group by projects.projectid, projects.name order by projects.projectid limit 2 offset ${offset};`;
      sqlCount += ` where ${params.join(
        " and "
      )} group by projects.projectid, projects.name order by projects.projectid;`;
    }
    console.log(sql);
    db.query(sqlCount, (err, count) => {
      let jumlahData = count.rows.length;
      let jumlahHalaman = Math.ceil(jumlahData / 2);
      console.log(count.rows.length);
      db.query(sql, (err, data) => {
        if (err) {
          throw err;
        }
        db.query(
          "select options from users where userid = $1",
          [req.session.user.userid],
          (err, options) => {
            if (err) {
              throw err;
            }
            db.query("select * from users", (err, names) => {
              if (err) {
                throw err;
              }
              res.render("../views/projects/lists", {
                data: data.rows,
                options: options.rows[0].options,
                names: names.rows,
                findId,
                findMember,
                findName,
                jumlahHalaman,
                page,
                url,
              });
            });
          }
        );
      });
    });
  });

  router.post("/", helpers.isLoggedIn, (req, res) => {
    const { projectid, name, members } = req.body;

    db.query(
      "update users set options = $1 where userid = $2",
      [req.body, req.session.user.userid],
      (err, data) => {
        if (err) {
          return res.render(err);
        }
        res.redirect("/projects");
      }
    );
  });

  return router;
};
