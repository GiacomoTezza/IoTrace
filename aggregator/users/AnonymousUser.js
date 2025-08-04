const AbstractUser = require("./AbstractUser");
const UserHandler = require("../handlers/UserHandler");

class AnonymousUser extends AbstractUser {
    constructor() {
        super();
    }

    static async generateJWT(id, email) {
        return await UserHandler.generateToken(id, email);
    }

    static async login(email, password) {
        return await UserHandler.login(email, password);
    }

    static async createAccount(username, userType, email, password) {
        return await UserHandler.createAccount(username, userType, email, password);
    }
}