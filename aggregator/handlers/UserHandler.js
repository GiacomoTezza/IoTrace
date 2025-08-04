const User = require("../db/user").User;
const jwt = require("jsonwebtoken");
const NotFoundException = require("../exceptions/NotFoundException");
const FailedDependencyException = require("../exceptions/FailedDependencyException");
const WrongPasswordException = require("../exceptions/WrongPasswordException");

class UserHandler {
    static async createAccount(username, userType, email, password) {
        // check if email already exists
        let user = await User.findOne({ email: email });
        if (user) throw new FailedDependencyException("Email already in use");

        user = await User.create({
            email: email,
            password: password,
            username: username,
            userType: userType,
        });
        return user;
    }

    static async deleteAccount(idUser) {
        // check if user exists
        let user = await User.findById(idUser);
        if (!user) throw new NotFoundException("User not found");

        await User.deleteOne({ _id: idUser })
            .catch((err) => {
                throw new FailedDependencyException("Error deleting user");
            });
        
        return user;
    }

    static async changePassword(idUser, oldPassword, newPassword) {
        // check if user exists
        let user = await User.findById(idUser);
        if (!user) throw new NotFoundException("User not found");

        // check if oldPassword is correct
        let isValid = await user.isValidPassword(oldPassword);
        if (!isValid) throw new WrongPasswordException("Wrong password");

        // check if oldPassword is different from newPassword
        if (oldPassword === newPassword) throw new FailedDependencyException("New password must be different from old password");

        await User.updateOne({ _id: idUser }, { password: await user.hashPassword(newPassword) })
            .catch((err) => {
                throw new FailedDependencyException("Error updating password");
            }
        );

        return user;
    }

    static async getAccount(idUser) {
        // check if user exists
        let user = await User.findById(idUser);
        if (!user) throw new NotFoundException("User not found");

        return user;
    }

    static async generateToken(id, email) {
        return jwt.sign(
            {
                user: {
                    _id: id,
                    email: email
                }
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );
    }

    static async login(email, password) {
        // check if user exists
        const user = await User.findOne({ email });
        if (!user) throw new NotFoundException("User not found");

        // check if password is correct
        let isValid = await user.isValidPassword(password);
        if (!isValid) throw new WrongPasswordException("Wrong password");

        return user;
    }
}

module.exports = UserHandler;