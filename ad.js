const fs = require('fs')
const path = require('path')
const express = require('express')
const multer = require("multer");

const {
    private
} = require('./tools')
const app = new express.Router()
module.exports = app

const db = require("./db.json");
if(!db.ads) {
    db.ads = []
    save();
}

var saveLock = false;
function save() {
    if(saveLock) return
    saveLock = true
    fs.writeFile("db.json", JSON.stringify(db), e => saveLock = false)
}

app.get("/tags", (req, res) => {
    return res.json([
        "a",
        "b",
        "c"
    ])
})

app.get("/id", (req, res) => { // /id?id=12 -> ad {...} : "error"
    var { id } = req.query;
    const d = parseInt(id);
    if(d === NaN) return res.status(400).json("id must be number")
    var ad = db.ads[d];
    if(!ad || !ad.published) return res.status(400).json("ad does not exist")
    res.json(ad)
})

app.get("/find", (req, res) => { // /find?tags=a,b,c&offset=10&number=7 -> [ad {...}]
    var { offset, number, tags } = req.query;
    if(offset === undefined) offset = 0;
    if(number === undefined) number = db.ads.length;
    if(tags === undefined) {
        tags = [];
    } else {
        tags = tags.split(',')
    }
    var rs = db.ads.filter(e => e.published).filter((e, i) => {
        if(i < offset || i <= offset + number - 1) return false;
        for(var i of e) {
            if(!e.tags.includes(i)) {
                return false
            }
        }
        return true;
    })
    res.json(rs);
})

app.use("/image", express.static(path.join(__dirname, `./ad_images`))) // /image/:image.png -> png

app.get("/create", (req, res) => { // /create -> ad {id}
    const id = db.ads.push({}) - 1;
    db.ads[id].id = id;
    save();
    res.json({ id });
})

app.post("/set/info", (req, res) => { // POST /set/info body: { id, tags: [a, b, c], info: JSON } -> "ok" : "error"
    var { id, info, tags } = req.body;
    const d = parseInt(id);
    if(d === NaN) return res.status(400).json("id must be number")
    db.ads[d].tags = tags;
    db.ads[d].info = info;
    save();
    res.json("ok")
})


const upload = multer({
    dest: "./ad_images",
    fileSize: 1024 * 1024 * 4,
    files: 1,
    fields: 3
});


app.post("/add/image", upload.single("file"), (req, res) => { // upload image, get image link id
    var { id } = req.body;
    const d = parseInt(id);
    
    const tempPath = req.file.path;
    console.log('here at /add/image', id)
    if(d === NaN) {
        fs.unlink(tempPath, err => {});
        return res.status(400).json("id must be number")
    }
    var ad = db.ads[d];
    if(!ad) {
        fs.unlink(tempPath, err => {});
        return res.status(400).json("ad does not exist")
    }

    ad.images = ad.images || [];
    var img = ad.images.push(`${d}_${ad.images.length}.png`) - 1;
    const targetPath = path.join(__dirname, `./ad_images/${d}_${img}.png`);

    console.log("got image", targetPath);

    if(path.extname(req.file.originalname).toLowerCase() === ".png") {
        fs.rename(tempPath, targetPath, err => {
            if (err) return res.status(500).json("couldn't upload")
            res.send(`${d}_${img}.png`);
        });
    } else {
        fs.unlink(tempPath, err => {});
        res.status(403).json("only .png files are allowed");
    }
    save();
})

app.get("/delete/image", (req, res) => { // /delete/image?id=12&image=2
    var { id, image } = req.query;
    const d = parseInt(id);
    const img = parseInt(image);
    if(d === NaN) return res.status(400).json("id must be number")
    if(img === NaN) return res.status(400).json("image must be number")
    var ad = db.ads[d];
    if(!ad) return res.status(400).json("ad does not exist")
    if(!ad.images || !ad.images[img]) return res.status(400).json("image does not exist")

    const targetPath = path.join(__dirname, `./ad_images/${d}_${img}.png`);
    fs.unlink(targetPath, err => {
        if (err) return res.status(500).json("couldn't delete")
        ad.images[img] = null;
        res.status(403).json("ok");
        save();
    });
})

app.get("/publish", (req, res) => { // /publish?id=12
    var { id } = req.query;
    const d = parseInt(id);
    if(d === NaN) return res.status(400).json("id must be number")
    var ad = db.ads[d];
    if(!ad) return res.status(400).json("ad does not exist")
    ad.published = true;
    save();
    res.json("ok")
})

app.get("/delete", (req, res) => { // /delete?id=12 -> "ok" : "error"
    var { id } = req.query;
    const d = parseInt(id);
    if(d === NaN) return res.status(400).json("id must be number")
    var ad = db.ads[d];
    if(!ad) return res.status(400).json("ad does not exist")
    db.ads[d] = null;
    // delete images
    save();
    res.json("ok")
})

app.get("/me", (req, res) => { // /me?tags=a,b,c&offset=10&number=7 -> [ad {...}]
    var { offset, number, tags } = req.query;
    if(offset === undefined) offset = 0;
    if(number === undefined) number = db.ads.length;
    if(tags === undefined) {
        tags = [];
    } else {
        tags = tags.split(',')
    }
    var rs = db.ads.filter((e, i) => {
        if(i < offset || i > offset + number - 1) return false;
        for(var j in e) {
            for(var tag of tags) {
                if(e[j].tags && !e[j].tags.includes(tag)) {
                    return false;
                }
            }
        }
        return true;
    })
    res.json(rs);
})