const express = require('express')
const {
    private,
    secret
} = require('./tools')
const app = new express.Router()
module.exports = app


app.get("/register", async (req, res) => {
	if(req.query.email && req.query.password) {
        // TODO sanity check
        const code = secret(6)
        // TODO save code to db
        // TODO send code to email
        try {
            await req.user.register(req.query.email, req.query.password)
        } catch (err) {
            return res.status(500).json(err)
        }

		return res.json("ok")
    }
	return res.status(400).json("need email and password")
})

app.get("/login", async (req, res) => {
    if(req.query.email && req.query.password) {
        // TODO validate login from db
        // TODO see if verified
        try {
            await req.user.login(req.query.email, req.query.password)
        } catch (err) {
            return res.status(err).json(err)
        }
        return res.json(req.user)
    }
	return res.status(400).json("need email and password")
})

app.get("/code", (req, res) => { // mobile
    // TODO get code from db
	if(req.query.code == "123456") {
		if(req.user.id) {
			req.db.all("update user set access=? where id=?", [5, req.user.id], (err, rows) => {

            })
			return res.json("ok")
		}
		return res.status(400).json("need /user/login with email")
	} else {
		return res.status(400).json("wrong code (test: 123456)")
	}
})

app.get("/verify/:userid/:code", (req, res) => { // email
    req.db.all("select * from emailCodes where user=?", [req.params.userid], (err, rows) => {
        const r = rows[0];
        if(r && r.code == req.params.code) {
            req.db.all("update user set access=? where id=?", [3, req.params.id], (err, rows) => {
                if(err) {    
                    return res.status(400).json("wrong code (test: /verify/12/123456)")
                }
            })
        }
    })
    return res.json("ok")
})
// TODO app.get("/account") phone name ...

