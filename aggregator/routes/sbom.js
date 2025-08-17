const express = require("express");
const router = express.Router();
const SbomHandler = require("../handlers/SbomHandler");
const { errorRes, successRes } = require("../response");
const NotFoundException = require("../exceptions/NotFoundException");

router.get("/current/:did", async (req, res) => {
	try {
		const did = req.params.did;
		const sbom = await SbomHandler.getCurrent(did);
		successRes(res, "Current SBOM fetched successfully", sbom, 200);
	} catch (error) {
		if (error instanceof NotFoundException) {
			errorRes(res, error.message, 404);
		} else {
			errorRes(res, "Internal server error", 500);
		}
	}
});

router.get("/:sbomId", async (req, res) => {
	try {
		const sbomId = req.params.sbomId;
		const sbom = await SbomHandler.getById(sbomId);
		successRes(res, "SBOM fetched successfully", sbom, 200);
	} catch (error) {
		if (error instanceof NotFoundException) {
			errorRes(res, error.message, 404);
		} else {
			errorRes(res, "Internal server error", 500);
		}
	}
});

router.post("/compare", async (req, res) => {
	try {
		const { a, b } = req.body;
		if (!a || !b) {
			return errorRes(res, "Both SBOMs must be provided for comparison", 400);
		}
		const result = await SbomHandler.compare(a, b);
		successRes(res, "SBOMs compared successfully", result, 200);
	} catch (error) {
		if (error instanceof NotFoundException) {
			errorRes(res, error.message, 404);
		} else {
			errorRes(res, "Internal server error", 500);
		}
	}
});

module.exports = router;
