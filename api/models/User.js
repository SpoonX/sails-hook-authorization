var bcrypt = require('bcrypt');

module.exports = {
  attributes: {
    username: {
      type    : 'string',
      required: true,
      unique  : true
    },

    email: {
      type    : 'email',
      required: true,
      unique  : true
    },

    password: {
      type    : 'string',
      required: true,
    },

    emailConfirmed: {
      type      : 'boolean',
      defaultsTo: false
    },

    isPasswordValid: function (password, cb) {
      bcrypt.compare(password, this.password, cb);
    },

    toJSON: function () {
      var values = this.toObject();

      delete values.password;

      return values;
    }
  },

  beforeCreate: encryptPassword,
  beforeUpdate: encryptPassword
};

function encryptPassword (values, next) {
  if (!values.password) {
    return next();
  }

  bcrypt.hash(values.password, 10, function (error, hash) {
    if (error) {
      return next(error);
    }

    values.password = hash;

    next();
  });
}
