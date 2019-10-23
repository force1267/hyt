const express = require('express')
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

app.get("/user/login", (req, res) => {
	if(req.query.phone) {
		req.session.phone = req.query.phone
		return res.json("ok")
	}
	return res.status(400).json("need phone number")
})
app.get("/user/code", (req, res) => {
	if(req.query.code == "123456") {
		if(req.session.phone) {
			req.session.auth = true
			return res.json("ok")
		}
		return res.status(400).json("need /user/login with phone number")
	} else {
		return res.status(400).json("wrong code (test: 123456)")
	}
})

function private(req, res, next) {
	if(req.session.auth) {
		return next()
	}
	res.status(401).json("must login")
}

app.get("/session", (req, res) => {
	var n = req.session.visits || 0;
	var sid = req.session.hotelSessionId;
	res.json({
		visits: n,
		hotelSessionId: sid
	});
})
app.get("/session/reset", (req, res) => {
	req.session = null
	res.json("ok")
})

app.get("/hotel/find", async (req, res) => {
	const {
		from,
		to,
		country,
		city,
		hotel,
	} = req.query;
	if(!from || !to || !country || (!city && !hotel)) {
		return res.status(400).json("need from, to Dates and country, city")
	}

	try {
		await fetch("http://hotelapi.takbelit.com/api/hotel/AvailabilityByCityID", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				"SessionId": req.session.hotelSessionId,
				"CheckIn": from,
				"CheckOut": to,
				"SetGeoLocation": false,
				"NationalityId": country,
				"HotelId": !city ? hotel : null,
				"CityId": !hotel ? city : null,
				"Occupancies": null
			})
		})
		.then(r => r.json())
		.then(r => {
			console.log(r)
			// r = require("./view.json")
			if(!r["PricedItineraries"]) {
				throw "no hotel found"
			}
			const hs = []
			const hotels = r["PricedItineraries"]
			for(var h of hotels) {
				const rooms = []
				for(const room of h.Rooms) {
					rooms.push({
						name: room.Name,
					})
				}
				hs.push({
					hotelId: h.HotelId,
					currency: h.Currency,
					paymentDeadline: h.PaymentDeadline,
					priceCode: h.FareSourceCode,
					rooms
				})
			}
			console.log(hs)
			return res.json(hs)
		})
	} catch (err) {
		console.log(err)
		return res.status(500).json(err)
	}
})


app.get("/hotel/price", async (req, res) => {
	const {
		priceCode,
	} = req.query;
	if(!priceCode) {
		return res.status(400).json("need priceCode")
	}

	try {
		await fetch("http://hotelapi.takbelit.com/api/hotel/CheckRate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				"SessionId": req.session.hotelSessionId,
				"FareSourceCode": priceCode
			})
		})
		.then(r => r.json())
		.then(r => {
			console.log(r["ClientBalance"])
			if(!r["ClientBalance"]) {
				throw "no hotel found"
			}
			return res.json(r["ClientBalance"])
		})
	} catch (err) {
		console.log(err)
		return res.status(500).json(err)
	}
})

app.get("/hotel/images", async (req, res) => {
	const {
		id,
	} = req.query;
	if(id == undefined) {
		return res.status(400).json("need priceCode")
	}

	try {
		await fetch("http://hotelapi.takbelit.com/api/hotel/Image", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				"SessionId": req.session.hotelSessionId,
				"HotelId": id
			})
		})
		.then(r => r.json())
		.then(r => {
			console.log(r["Links"])
			if(!r["Links"]) {
				throw "no hotel found"
			}
			return res.json(r["Links"])
		})
	} catch (err) {
		console.log(err)
		return res.status(500).json(err)
	}
})

app.get("/hotel/reserve", private, (req, res) => {
	const {
		hotelId
	} = req.query
	if(!hotelId) {
		return res.status(400).json("need hotelId")
	}
	db.all("INSERT INTO reserved values(?, ?)", [req.session.phone, hotelId], (err, rows) => {
		if(err) {
			console.log(err)
			return res.status(500).json("couldn't add to database")
		} else {
			return res.json("ok")
		}
	})
})

app.get("/hotel/reserved", private, (req, res) => {
	db.all("SELECT * FROM reserved WHERE phone=?", [req.session.phone], (err, rows) => {
		if(err) {
			console.log(err)
			return res.status(500).json("couldn't read from database")
		} else {
			return res.json(rows)
		}
	})
})

app.get("/hotel/cancel", private, (req, res) => {
	const {
		hotelId
	} = req.query
	if(!hotelId) {
		return res.status(400).json("need hotelId")
	}
	db.all("DELETE FROM reserved WHERE phone=? AND hotelId=?", [req.session.phone, hotelId], (err, rows) => {
		if(err) {
			console.log(err)
			return res.status(500).json("couldn't delete from database")
		} else {
			return res.json("ok")
		}
	})
})

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
console.log("app running on http://localhost:8080")

db.all("CREATE TABLE IF NOT EXISTS reserved(phone TEXT, hotelID TEXT)", (err, rows) => {
	if(err) {
		console.log(err)
		console.error("couldn't initialize database")
	} else {
		console.log("ok")
	}
})