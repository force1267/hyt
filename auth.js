const {
    private,
    password,
} = require('./tools')

function auth(req, res, next) {
    req.user = {
        id: null,
        email: null,
        access: 0,

        async logout() {
            req.session.userid = null;
            this.id = null
            this.email = null;
            this.access = 0
        },

        async login(email, pass) {
            req.db.all("select * from user where email=?", [email], (err, rows) => {
                if(err) throw 500;
                if(rows.length > 0) {
                    const r = rows[0];
                    password(pass).verify(r.hash, (err, verified) => {
                        if(verified) {
                            req.user.email = r.email
                            req.user.access = r.access
                            req.session.userid = req.user.id = r.id
                        }
                    })
                } else {
                    throw 400
                }
            })
        },

        async register(email, pass) {
            req.db.all("select * from user where email=?", [email], (err, rows) => {
                if(err) throw 500
                if(rows.length === 0) {
                    password(pass).hash((err, hash) => {
                        req.db.all("insert into user(email, access, hash) values(?,?,?)", [email, 1, hash], (err, rows) => {
                            req.db.all("select * from user where email=?", [email], (err, rows) => {
                                if(err) throw 500
                                if(rows.length > 0) {
                                    const r = rows[0];
                                    req.user.email = r.email
                                    req.user.access = r.access
                                    req.session.userid = req.user.id = r.id
                                } else {
                                    throw 400
                                }
                            })
                        })
                    })
                } else {
                    throw 400
                }
            })
        },
    }

    if(req.session.userid) {
        req.db.all("select * from user where id=?", [req.session.userid], (err, rows) => {
            if(err) return next();
            if(rows.length > 0) {
                const r = rows[0];
                req.user.access = r.access
                req.user.id = r.id
            }
        })
    }
    return next();
}

module.exports = auth