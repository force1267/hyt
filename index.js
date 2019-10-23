const express = require('express')
const {
	private
} = require('./tools')

const bodyParser = require('body-parser')
const cookieSession = require('cookie-session')
const fetch = require('node-fetch')
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database(".db")

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.set('trust proxy', 1)
app.use(cookieSession({
	name: 'session',
	keys: ['123', '456']
}))

app.use(req => {
	req.db = db;
	return req.next();
})

app.use(require("./auth"))

// user
app.use("/user", require("./user"))

// session
app.use("/session", require("./session"))

// hotel
app.use("/hotel", require("./hotel"))

// ad
app.use("/ad", require("./ad"))


app.get("/", async (req, res) => {
	var n = req.session.visits || 0;
	req.session.visits = n + 1;
	if(!req.session.hotelSessionId) {
		await fetch("http://hotelapi.takbelit.com/api/hotel/login",{ method: "POST" })
		.then(r => r.json())
		.then(sid => {
			req.session.hotelSessionId = sid;
			console.log(req.session.hotelSessionId);
		})
	}
	return express.static("./public")(req, res, req.next);
})

app.use(express.static(__dirname + '/public'));

app.use(req => req.res.status(404).json("404"))

app.listen(80)
console.log("app running on http://localhost:80")

db.all("CREATE TABLE IF NOT EXISTS reserved(user INTEGER, hotelID TEXT)", (err, rows) => {
	if(err) {
		console.log(err)
		console.error("couldn't initialize table reserved")
	} else {
		console.log("initialized reserved")
	}
})

db.all("CREATE TABLE IF NOT EXISTS user(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, access INTEGER, hash TEXT)", (err, rows) => {
	if(err) {
		console.log(err)
		console.error("couldn't initialize table user")
	} else {
		console.log("initialized user")
	}
})

db.all("CREATE TABLE IF NOT EXISTS emailCodes(user INTEGER, code TEXT)", (err, rows) => {
	if(err) {
		console.log(err)
		console.error("couldn't initialize table emailCodes")
	} else {
		console.log("initialized emailCodes")
	}
})