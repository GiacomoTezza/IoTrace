const mongoose = require('mongoose');

const dbPwd = encodeURIComponent(process.env.DB_PWD);
const dbUser = encodeURIComponent(process.env.DB_USER);
const dbName = encodeURIComponent(process.env.DB_NAME);

const dbUrl = `mongodb://${dbUser}:${dbPwd}@mongo:27017/${dbName}`;

mongoose.Promise = global.Promise;
mongoose.connect(dbUrl);

module.export = { mongoose };
