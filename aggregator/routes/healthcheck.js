const express = require("express");
const router = express.Router();
const { errorRes, successRes } = require("../response");

router.get("/", (req, res) => {
	successRes(res, "Health check successful", { status: "OK" }, 200);
});

module.exports = router;
