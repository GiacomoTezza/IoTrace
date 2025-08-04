const express = require("express");
const router = express.Router();
const { errorRes, successRes } = require("../response");

const passport = require("passport");
const jwt = require("jsonwebtoken");
const { checkSchema, validationResult } = require("express-validator");

const userSchemaSignUP = require("../validation").userSchemaSignUP;
const userSchemaLogin = require("../validation").userSchemaLogin;

const { ServerResponse } = require("http");
const AnonymousUser = require("../users/AnonymousUser");

const BadRequestException = require("../exceptions/BadRequestException");
const UnauthorizedException = require("../exceptions/UnauthorizedException");

// router.post(
//   "/signup",
//   checkSchema(userSchemaSignUP),
//   function (req, res, next) {
//     let val = validationResult(req);
//     if (!val.isEmpty()) {
//       return errorRes(res, val, "Signup failed, incomplete values", 401);
//     }

//     try {
//       passport.authenticate("signup", function (err, user, info) {
//         if (err || !user) {
//           return errorRes(res, err, "Signup failed", 401);
//           // return errorRes(res, err, JSON.stringify(user), 401);
//         }

//         req.login(user, { session: false }, async (error) => {
//           if (error) return errorRes(res, error, "Signup failed", 401);

//           const token = await AnonymousUser.generateJWT(user._id, user.email);

//           return successRes(
//             res,
//             "Signup successful",
//             {
//               token: token,
//               userType: user.userType,
//             },
//             200
//           );
//         });
//       })(req, res, next);
//     } catch (err) {
//       return errorRes(res, err, "Signup failed", 401);
//     }
//   }
// );

// Setting up route for logging in a user
router.post("/login", checkSchema(userSchemaLogin), async (req, res, next) => {
	let val = validationResult(req);
	try {
		if (!val.isEmpty()) {
			throw new BadRequestException("Fields not valid");
		}
		passport.authenticate("login", async (err, user, info) => {
			if (err) {
				return errorRes(res, err, err.message, err.code);
			}

			req.login(user, { session: false }, async (error) => {

				const token = await AnonymousUser.generateJWT(user._id, user.email);

				return successRes(res, "Login successful", {
					token: token,
					userType: user.userType,
				});
			});
		})(req, res, next);
	} catch (err) {
		return errorRes(res, err, err.message, err.code);
	}
});

module.exports = router;
