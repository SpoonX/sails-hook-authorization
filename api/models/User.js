var bcrypt = require('bcrypt');


module.exports = {
  attributes: {
    username: {
      type : 'string',
      required:true,
      unique: true
    },

    email: {
      type : 'string',
      required:true,
      unique: true,
      isEmail: true,
    },

    password: {
      type    : 'string',
      required: true
    },

    emailConfirmed: {
      type      : 'boolean',
      defaultsTo: false
    }
  },

  customToJSON: function() {
  // Return a shallow copy of this record with the password.
    return _.omit(this, ['password' ])
  },

  beforeCreate: encryptPassword,
  beforeUpdate: (values, next) => {
    if (!values.password) {
      delete values.password;

      return next();
    }

    try {
      // check if the password is already hashed
      bcrypt.getRounds(values.password);
    } catch(e) {
      return encryptPassword(values, next);
    }

    next();
  }
};

function encryptPassword(values, next) {
  if (!values.password) {
    return next();
  }

  bcrypt.hash(values.password, 10, (error, hash) => {
    if (error) {
      return next(error);
    }

    values.password = hash;

    next();
  });
}
