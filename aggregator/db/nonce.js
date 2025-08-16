const mongoose = require('mongoose');

const NonceSchema = new mongoose.Schema({
	deviceId: { type: String, required: true, index: true },
	nonce: { type: String, required: true, unique: true, index: true },
	ts: { type: Date, required: true },
	createdAt: { type: Date, default: Date.now, expires: 7200 }, // TTL 2h
}, { versionKey: false });

var Nonce = mongoose.model('Nonce', NonceSchema);

module.exports = {
	Nonce: Nonce,
};
