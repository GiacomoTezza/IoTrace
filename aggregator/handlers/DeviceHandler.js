const Device = require('../db/device').Device;
const NotFoundException = require("../exceptions/NotFoundException");

class DeviceHandler {

    static async getAllDevices() {
        try {
            const devices = await Device.find({}).sort({ createdAt: -1 }).exec();
            if (!devices || devices.length === 0) {
                throw new NotFoundException('No devices found');
            }
            return devices;
        } catch (error) {
            console.error('[DB|Device] Error fetching devices:', error);
            throw error;
        }
    }
}

module.exports = DeviceHandler;
