const express = require('express')
const {
    private
} = require('./tools')
const app = new express.Router()
module.exports = app


app.get("/find", (req, res) => {}) // tags, offset, number

app.get("/images", (req, res) => {}) // ad id

app.get("/create", (req, res) => {}) // get ad id

app.get("/set/info", (req, res) => {}) // tags info

app.post("/add/image", (req, res) => {}) // upload image, get image link id

app.get("/delete/image", (req, res) => {}) // delete image id

app.get("/post", (req, res) => {}) // ad id

app.get("/delete", (req, res) => {}) // ad id

app.get("/me", (req, res) => {}) // ad id
