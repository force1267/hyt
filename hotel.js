const express = require('express')
const {
	private
} = require('./tools')
const app = new express.Router()
module.exports = app


app.get("/find", async (req, res) => {
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


app.get("/price", async (req, res) => {
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

app.get("/images", async (req, res) => {
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

app.get("/reserve", private(5), (req, res) => {
	const {
		hotelId
	} = req.query
	if(!hotelId) {
		return res.status(400).json("need hotelId")
	}
	req.db.all("INSERT INTO reserved values(?, ?)", [req.session.phone, hotelId], (err, rows) => {
		if(err) {
			console.log(err)
			return res.status(500).json("couldn't add to database")
		} else {
			return res.json("ok")
		}
	})
})

app.get("/reserved", private(5), (req, res) => {
	req.db.all("SELECT * FROM reserved WHERE phone=?", [req.session.phone], (err, rows) => {
		if(err) {
			console.log(err)
			return res.status(500).json("couldn't read from database")
		} else {
			return res.json(rows)
		}
	})
})

app.get("/cancel", private(5), (req, res) => {
	const {
		hotelId
	} = req.query
	if(!hotelId) {
		return res.status(400).json("need hotelId")
	}
	req.db.all("DELETE FROM reserved WHERE phone=? AND hotelId=?", [req.session.phone, hotelId], (err, rows) => {
		if(err) {
			console.log(err)
			return res.status(500).json("couldn't delete from database")
		} else {
			return res.json("ok")
		}
	})
})