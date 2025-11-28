const Datastore = require('nedb-promises');
const path = require('path');

const createDB = (name) => {
    return Datastore.create({
        filename: path.join(__dirname, 'data', `${name}.db`),
        autoload: true,
        timestampData: true,
    });
};

const users = createDB('users');
const issues = createDB('issues');

// Ensure unique constraints
users.ensureIndex({ fieldName: 'username', unique: true });
users.ensureIndex({ fieldName: 'email', unique: true });

module.exports = { users, issues };
