const crypto = require('crypto')

function private(level = 0) {
	// 1:logged in
	// 3:verified
	// 5:phone
	// 7:vip
	// 9:mod
	// 11:admin
	return (req, res, next) => {
		if(req.user.access >= level) {
			return next()
		}
		return res.status(401).json("low access")
	}
}

function secret(bytes = 6) {
	return parseInt(crypto.randomBytes(bytes / 2 + 1).toString('hex'), 16).toString().slice(0, bytes)
}

function password(pass) {
	return {
		hash(cb) { // cb(err, hash)
			return cb(null, sha512(pass, secret(6)))
		},
		verify(hash, cb) { // cb(err, verified)
			const salt = hash.split('.')[0];
			return cb(null, hash === sha512(pass, salt))
		}
	}
}

function sha512(password, salt){
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    var value = hash.digest('hex');
    return `${salt}.${value}`;
};

module.exports = {
	private,
	secret,
	password,
}