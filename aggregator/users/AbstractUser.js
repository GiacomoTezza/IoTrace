const UnauthorizedException = require("../exceptions/UnauthorizedException");

class AbstractUser {
    constructor() {
        if (this.constructor === AbstractUser) {
            throw new TypeError(
                "Cannot be instantiated because it is an abstract class"
            );
        }
    }

    
}

module.exports = AbstractUser;