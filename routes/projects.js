var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const { response } = require("express");
const saltRounds = 10;
const helpers = require("../helpers/util");

module.exports = function (db) {
  const namePage = 'projects'
  router.get("/", helpers.isLoggedIn, (req, res) => {
    const url = req.url == "/" ? "/projects/?page=1" : `/projects${req.url}`;
    const findName = req.query.findName;
    const findId = parseInt(req.query.findId);
    const findMember = parseInt(req.query.findMember);
    var page = parseInt(req.query.page) || 1;
    var size = 2;
    var offset = (page - 1) * size;
    let params = [];
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

    if (page) {
      sql = `select projects.projectid, projects.name, ARRAY_AGG(' ' || users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) group by projects.projectid, projects.name order by projects.projectid limit 2 offset ${offset};`;
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
    db.query(sqlCount, (err, count) => {
      let jumlahData = count.rows.length;
      let jumlahHalaman = Math.ceil(jumlahData / 2);
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
                namePage
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

  router.get("/form", helpers.isLoggedIn, (req, res) => {
    db.query("select * from users", (err, users) => {
      res.render("../views/projects/form", {
        users: users.rows, namePage
      });
    });
  });

  router.post("/form", helpers.isLoggedIn, (req, res) => {
    db.query(
      "insert into projects(name) values($1) returning *",
      [req.body.name],
      (err, project) => {
        let projectid = project.rows[0].projectid;
        let sql = "insert into members(userid, role, projectid) values";

        for (let i = 0; i < req.body.userid.length; i++) {
          if (i < req.body.userid.length - 1) {
            sql += `(${req.body.userid[i]}, '', ${projectid}),`;
          }
          if (i == req.body.userid.length - 1) {
            sql += `(${req.body.userid[i]}, '', ${projectid})`;
          }
        }
        db.query(sql, (err) => {
          res.redirect("/projects");
        });
      }
    );
  });

  router.get("/edit/:id", helpers.isLoggedIn, (req, res) => {
    let projectid = req.params.id;
    db.query(
      "select projects.projectid, projects.name, ARRAY_AGG(users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) where projectid = $1 group by projects.projectid, projects.name order by projects.projectid",
      [projectid],
      (err, count) => {
        let name = count.rows[0].members;
        let name1 = [];
        for (let i = 0; i < name.length; i++) {
          if (i == 0) {
            name1.push("'" + name[i] + "'");
          }
          if (i > 0 && i == name.length - 2) {
            name1.push("'" + name[i] + "'");
          }

          if (i == name.length - 1) {
            name1.push("'" + name[i] + "'");
          }
        }
        name1.toString();
        db.query(
          `select * from users where not firstname in(${name1})`,
          (err, name) => {
            db.query(
              `select * from users where firstname in(${name1})`,
              (err, data) => {
                res.render("../views/projects/edit", {
                  data: data.rows,
                  name: name.rows,
                  count: count.rows,
                  namePage
                });
              }
            );
          }
        );
      }
    );
  });

  router.post("/edit/:id", helpers.isLoggedIn, (req, res) => {
    let projectid = parseInt(req.params.id);
    db.query("delete from members where projectid = $1", [projectid], (err) => {
      db.query(
        "update projects set name = $1 where projectid= $2",
        [req.body.name, projectid],
        (err) => {
          let sql = "insert into members(userid, role, projectid) values";

          for (let i = 0; i < req.body.userid.length; i++) {
            if (i < req.body.userid.length - 1) {
              sql += `(${req.body.userid[i]}, '', ${projectid}),`;
            }
            if (i == req.body.userid.length - 1) {
              sql += `(${req.body.userid[i]}, '', ${projectid})`;
            }
          }
          db.query(sql, (err) => {
            res.redirect("/projects");
          });
        }
      );
    });
  });

  router.get("/delete/:id", helpers.isLoggedIn, (req, res) => {
    let projectid = parseInt(req.params.id);
    db.query("delete from members where projectid = $1", [projectid], (err) => {
      db.query(
        "delete from projects where projectid= $1",
        [projectid],
        (err) => {
          if (err) {
            throw err;
          }
          res.redirect("/projects");
        }
      );
    });
  });

  router.get('/overview/:projectid', helpers.isLoggedIn, (req, res) => {
    const projectid = req.params.projectid
    const nameSidebar = 'overview'
    db.query("select projects.projectid, projects.name, ARRAY_AGG(users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) where projectid = $1 group by projects.projectid, projects.name order by projects.projectid", [projectid], (err, count) => {
      let name = count.rows[0].members;
        let name1 = [];
        for (let i = 0; i < name.length; i++) {
          if (i == 0) {
            name1.push("'" + name[i] + "'");
          }
          if (i > 0 && i == name.length - 2) {
            name1.push("'" + name[i] + "'");
          }

          if (i == name.length - 1) {
            name1.push("'" + name[i] + "'");
          }
        }
        name1.toString();
        db.query(`select * from users where firstname in(${name1})`,(err, data) => {
          res.render('../views/projects/project-details/overview', {namePage, data: data.rows, nameSidebar, projectid})
        })
    })
  })

  router.get('/members/:projectid', helpers.isLoggedIn, (req, res) => {
    const projectid = req.params.projectid
    const url = req.url == `/members/${projectid}` ? `/projects/members/${projectid}?page=1` : `/projects${req.url}`;
    const nameSidebar = 'members'
    const {findName, findPosition} = req.query;
    var page = parseInt(req.query.page) || 1;
    var size = 2;
    var offset = (page - 1) * size;
    let params = [];
    if (findName) {
      params.push(`users.firstname ilike '%${findName}%'`);
    }
    if (findPosition) {
      params.push(`members.role = '${findPosition}'`);
    }

    let sql = `select users.firstname, members.userid, members.role, members.projectid from members left join users on members.userid = users.userid where projectid = ${projectid} order by users.firstname limit ${size} offset ${offset}`

    let sqlCount = `select users.firstname, members.userid, members.role, members.projectid from members left join users on members.userid = users.userid where projectid = ${projectid} order by users.firstname`

    if(params.length > 0){
      sql = `select users.firstname, members.userid, members.role, members.projectid from members left join users on members.userid = users.userid where projectid = ${projectid} and `

      sqlCount = `select users.firstname, members.userid, members.role, members.projectid from members left join users on members.userid = users.userid where projectid = ${projectid} and `

      sql += ` ${params.join(" and ")} order by users.firstname limit ${size} offset ${offset}` 
      sqlCount += ` ${params.join(" and ")} order by users.firstname` 
    }
    db.query(sqlCount, (err, count) => {
      let jumlahData = count.rows.length;
      let jumlahHalaman = Math.ceil(jumlahData / 2);
      db.query(sql, (err, data) => {
        db.query('select optionsmember from users where userid = $1', [req.session.user.userid], (err, optionsmember) => {
          res.render('../views/projects/project-details/members', {namePage, data: data.rows, nameSidebar, projectid, optionsmember: optionsmember.rows[0].optionsmember, jumlahHalaman,
            page, url, size})
        })
      })
    })
  })

  router.post('/members/:projectid', helpers.isLoggedIn, (req, res) => {
    const {projectid} = req.params
    const { id, firstname, position } = req.body
    db.query('update users set optionsmember = $1 where userid = $2', [req.body, req.session.user.userid], (err) => {
      res.redirect(`/projects/members/${projectid}`)
    })
  })

  router.get('/members/:projectid/edit/:userid', helpers.isLoggedIn, (req, res) => {
    const {projectid, userid} = req.params
    const nameSidebar = 'members'
    db.query('select * from members where projectid = $1 and userid = $2', [projectid, userid], (err, data) => {
      res.render('../views/projects/project-details/edit', {namePage, data: data.rows[0], nameSidebar, projectid})
    })
  })

  router.post('/members/:projectid/edit/:userid', helpers.isLoggedIn, (req, res) => {
    const {projectid, userid} = req.params
    const nameSidebar = 'members'
    db.query('update members set role = $1 where userid = $2',[req.body.role, userid], err => {
      res.redirect(`/projects/members/${projectid}`)
    })
  })

  router.get('/members/:projectid/add', helpers.isLoggedIn, (req, res) => {
    const {projectid} = req.params
    const nameSidebar = 'members'

    db.query("select projects.projectid, projects.name, ARRAY_AGG(users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) where projectid = $1 group by projects.projectid, projects.name order by projects.projectid", [projectid], (err, count) => {
      let name = count.rows[0].members;
        let name1 = [];
        for (let i = 0; i < name.length; i++) {
          if (i == 0) {
            name1.push("'" + name[i] + "'");
          }
          if (i > 0 && i == name.length - 2) {
            name1.push("'" + name[i] + "'");
          }

          if (i == name.length - 1) {
            name1.push("'" + name[i] + "'");
          }
        }
        name1.toString();
        console.log(name1)
        db.query(`select * from users where not firstname in(${name1})`, (err, data) => {
          res.render('../views/projects/project-details/add', {data: data.rows, nameSidebar, namePage, projectid})

        })
    })
  })

  router.post('/members/:projectid/add', helpers.isLoggedIn, (req, res) => {
    const {projectid} = req.params
    let sql = "insert into members(userid, role, projectid) values";

        for (let i = 0; i < req.body.userid.length; i++) {
          if (i < req.body.userid.length - 1) {
            sql += `(${req.body.userid[i]}, '', ${projectid}),`;
          }
          if (i == req.body.userid.length - 1) {
            sql += `(${req.body.userid[i]}, '', ${projectid})`;
          }
        }
        db.query(sql, (err) => {
          res.redirect(`/projects/members/${projectid}`)
        })
  })

  router.get('/members/:projectid/delete/:userid', helpers.isLoggedIn, (req, res) => {
    const { projectid, userid } = req.params

    db.query('delete from members where projectid = $1 and userid = $2', [projectid, userid], (err) => {
      res.redirect(`/projects/members/${projectid}`)
    })
  })
  return router;
};
