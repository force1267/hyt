const express = require('express')
const {
	private
} = require('./tools')
const app = new express.Router()
module.exports = app


app.get("/", (req, res) => {
	var n = req.session.visits || 0;
	var sid = req.session.hotelSessionId;
	res.json({
		visits: n,
		hotelSessionId: sid
	});
})
app.get("/reset", (req, res) => {
	req.session = null
	res.json("ok")
})