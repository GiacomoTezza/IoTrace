const emailSchema = {
  email: {
    isEmail: true,
    notEmpty: true,
    errorMessage: "Email is not valid",
  },
};

const passwordSchema = {
  password: {
    errorMessage:
      "The password must be at least 8 characters, and must contain a symbol",
    isLength: { options: { min: 8 } },
    matches: { options: /[!@#$%^&*]/ },
  },
};

const usernameSchema = {
  username: {
    notEmpty: true,
    errorMessage: "username is not valid",
    isLength: { options: { max: 100 } },
  },
};

const userTypeSchema = {
  userType: {
    optional: true,
    isIn: {
      options: [
        [
          "abstractUser",
          "anonymousUser",
          "admin",
          "supplyer",
          "user",
        ],
      ],
    },
  },
};

const userSchemaSignUP = {
  email: emailSchema.email,
  password: passwordSchema.password,
  username: usernameSchema.username,
  userType: userTypeSchema.userType,
};

const userSchemaLogin = {
  email: emailSchema.email,
  password: passwordSchema.password,
};

const changePasswordSchema = {
  oldPassword: passwordSchema.password,
  newPassword: passwordSchema.password,
};

module.exports = {
  userSchemaSignUP,
  userSchemaLogin,
  passwordSchema,
  emailSchema,
  usernameSchema,
  userTypeSchema,
  changePasswordSchema,
};
