const mongoose = require('mongoose');

const VulnCacheSchema = new mongoose.Schema({
	_id: { type: String, required: true }, // vuln id e.g. 'GHSA-...'
	data: { type: mongoose.Schema.Types.Mixed, required: true },
	fetchedAt: { type: Date, default: Date.now },
}, { collection: 'vuln_cache' });

const VulnCache = mongoose.model('VulnCache', VulnCacheSchema);

module.exports = {
	VulnCache: VulnCache,
};
