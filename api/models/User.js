var bcrypt = require('bcrypt');

module.exports = {
  attributes: {
    username: {
      type : 'string',
      index: true
    },

    email: {
      type : 'email',
      index: true
    },

    password: {
      type    : 'string',
      required: true
    },

    emailConfirmed: {
      type      : 'boolean',
      defaultsTo: false
    },

    toJSON: function() {
      var values = this.toObject();

      delete values.password;

      return values;
    }
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
