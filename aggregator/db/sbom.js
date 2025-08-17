const mongoose = require('mongoose');

const SignerSchema = new mongoose.Schema({
	subject: String,
	subjectCN: { type: String, index: true },
	issuer: String,
	serialNumber: String,
	notBefore: Date,
	notAfter: Date,
	fingerprint256: String,
}, { _id: false });

const VerificationSchema = new mongoose.Schema({
	chainOk: Boolean,
	signatureOk: Boolean,
	timestampSkewOk: Boolean,
	replayOk: Boolean,
	reason: String,
}, { _id: false });

const SbomSchema = new mongoose.Schema({
	topic: { type: String, required: true, index: true },
	deviceId: { type: String, required: true, index: true },
	receivedAt: { type: Date, default: Date.now, index: true },

	ts: { type: Date, required: true, index: true },
	nonce: { type: String, required: true, index: true },

	sbom: { type: mongoose.Schema.Types.Mixed, required: true },
	sbomHash: { type: String, required: true, index: true },
	sizeBytes: { type: Number },

	signatureB64: { type: String, required: true },
	signatureAlg: { type: String, default: 'RS256' },

	signerCertPem: { type: String, required: true },
	signer: { type: SignerSchema, required: true },

	verification: { type: VerificationSchema, required: true },
	verified: { type: Boolean, default: false, index: true },

	emqx: {
		qos: Number,
		retain: Boolean,
		mid: Number,
	},
}, { minimize: false, versionKey: false });

var SbomMessage = mongoose.model('SbomMessage', SbomSchema);

module.exports = {
	SbomMessage: SbomMessage,
};
