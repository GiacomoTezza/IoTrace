db = db.getSiblingDB('$external');
db.createUser({
	user: "CN=aggregator",
	roles: [{ role: "readWrite", db: "iotrace" }]
});
