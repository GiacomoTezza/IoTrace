const User = require("../db/user").User;

const passport = require("passport");
const localStrategy = require("passport-local").Strategy;
const JWTstrategy = require("passport-jwt").Strategy;

const AnonymousUser = require("../users/AnonymousUser");

// Setting up strategy for passport for registering a new user
passport.use(
	"signup",
	new localStrategy(
		{
			usernameField: "email",
			passwordField: "password",
			passReqToCallback: true,
		},
		async (req, email, password, done) => {
			try {
				const user = await AnonymousUser.createAccount(
					req.body.nome,
					"user",
					email,
					password,
					""
				);

				return done(null, user);
			} catch (error) {
				// console.log(error);
				return done(null, false);
			}
		}
	)
);

// Setting up strategy for passport for logging in an user
passport.use(
	"login",
	new localStrategy(
		{
			usernameField: "email",
			passwordField: "password",
		},
		async (email, password, done) => {
			try {
				const user = await AnonymousUser.login(
					email,
					password
				);

				return done(null, user, { message: "Logged in Successfully" });
			} catch (error) {
				return done(error);
			}
		}
	)
);

var cookieExtractor = function(req) {
	var token = null;
	if (req && req.cookies) {
		token = req.cookies["jwt"];
	}
	return token;
};

// Setting up strategy for passport for jwt
passport.use(
	new JWTstrategy(
		{
			secretOrKey: process.env.JWT_SECRET,
			// jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
			// jwtFromRequest: ExtractJWT.fromUrlQueryParameter("secret_token"),
			jwtFromRequest: cookieExtractor,
		},
		async (token, done) => {
			try {
				const user = await User.findById(token.user._id);

				if (!user) {
					return done(null, false, { message: "User not found" });
				}

				return done(null, token.user);
			} catch (error) {
				done(error);
			}
		}
	)
);

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	done(null, user);
});
