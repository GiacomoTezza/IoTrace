const express = require("express");
const router = express.Router();
const DeviceHandler = require("../handlers/DeviceHandler");
const { errorRes, successRes } = require("../response");
const NotFoundException = require("../exceptions/NotFoundException");

router.get("/all", async (req, res) => {
	try {
		const devices = await DeviceHandler.getAllDevices();
		successRes(res, "Devices fetched successfully", devices, 200);
	} catch (error) {
		if (error instanceof NotFoundException) {
			errorRes(res, error.message, 404);
		} else {
			errorRes(res, "Internal server error", 500);
		}
	}
});

module.exports = router;
