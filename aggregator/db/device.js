const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
	deviceId: { type: String, required: true, unique: true, index: true },
	lastSeen: { type: Date },
	lastSeenTopic: { type: String },
	lastCertFingerprint256: { type: String, index: true },

	createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

var Device = mongoose.model('Device', DeviceSchema);
module.exports = {
	Device: Device,
};
