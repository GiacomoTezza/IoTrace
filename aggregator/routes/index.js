// const passport = require("passport");
require("../auth/passport-auth");
require("../db/index")
require("../handlers/EmqxHandler");

const healthcheck = require("./healthcheck");
const auth = require("./auth");

const base_url = "/api";
passport_options = {
	session: false,
};

// Exporting routes
module.exports = (app) => {
	app.use(base_url + "/health", healthcheck);
	app.use(base_url + "/auth", auth);

	// Examples:
	// app.use(base_url, route-file-required);
	// app.use(base_url + "/route", passport.authenticate("jwt", passport_options), route-file-required);
};
