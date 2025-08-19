const mongoose = require('mongoose');

mongoose.set('strictQuery', false);
mongoose.Promise = global.Promise;
// Optional: enable debug if you need verbose queries
// if (process.env.MONGOOSE_DEBUG === 'true') {
//   mongoose.set('debug', true);
// }

const DB_USER = process.env.DB_USER;
const DB_PWD = process.env.DB_PWD;
const DB_NAME = process.env.DB_NAME;
const DB_HOST = process.env.DB_HOST || 'mongo';
const DB_PORT = process.env.DB_PORT || '27017';

// Build base URL
// const dbUrl = `mongodb://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PWD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
const dbUrl = `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}?authMechanism=MONGODB-X509`;

let readyResolve, readyReject;
const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });

// Expose a small helper to check current connection status
function isConnected() {
	// 1 = connected, 2 = connecting, 0 = disconnected, 3 = disconnecting
	return mongoose.connection && mongoose.connection.readyState === 1;
}

async function start() {
	// driver options; tune timeouts as desired
	const baseOptions = {
		serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || '5000', 10),
		connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT_MS || '10000', 10),
		maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '10', 10),
	};

	// TLS/mTLS options
	// If your Mongo is TLS-enabled, set MONGO_TLS=true and MONGO_CA_PATH, optionally client cert/key
	if (process.env.MONGO_TLS === 'true') {
		baseOptions.tls = true;
		if (process.env.MONGO_CA_PATH) baseOptions.tlsCAFile = process.env.MONGO_CA_PATH;
		if (process.env.MONGO_CLIENT_CERT) {
			baseOptions.tlsCertificateKeyFile = process.env.MONGO_CLIENT_CERT;
		}
	}

	// Retry loop with backoff
	const maxRetries = parseInt(process.env.MONGO_CONNECT_MAX_RETRIES || '20', 10);
	let attempt = 0;
	const baseDelay = 1000;

	while (true) {
		attempt++;
		try {
			await mongoose.connect(dbUrl, baseOptions);
			console.log('[DB] Connected to MongoDB');
			// resolve ready promise
			readyResolve();
			// register listeners
			mongoose.connection.on('error', (err) => console.error('[DB] connection error:', err && err.message));
			mongoose.connection.on('disconnected', () => console.warn('[DB] disconnected'));
			mongoose.connection.on('reconnected', () => console.log('[DB] reconnected'));

			// Check if the demo user is already created, otherwise create it
			const User = require('./user').User;
			const userCount = await User.countDocuments({});
			if (userCount === 0) {
				let user = await User.create({
					email: process.env.DEMO_EMAIL,
					password: process.env.DEMO_PASSWORD,
					username: "Demo User",
					userType: "user",
				}).catch((err) => {
					console.error('[DB] Error creating demo user:', err && err.message);
				});
				if (user) {
					console.log('[DB] Demo user created:', user.username);
				} else {
					console.warn('[DB] Demo user already exists or could not be created');
				}
			}
			return;
		} catch (err) {
			console.error('[DB] Mongo connection failed:', err && err.message);
			if (attempt >= maxRetries) {
				console.error('[DB] Max retries reached while connecting to MongoDB');
				readyReject(err);
				// process.exit(1);
				return;
			}
			const delay = Math.min(30000, baseDelay * Math.pow(1.5, attempt));
			console.log(`[DB] retrying in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})`);
			await new Promise(r => setTimeout(r, delay));
		}
	}
}

start().catch((err) => {
	console.error('[DB] Fatal start error:', err && err.message);
});

module.exports = {
	mongoose,
	ready,
	isConnected,
};

