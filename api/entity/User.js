var bcrypt   = require('bcrypt');
var {Entity} = require('wetland');

module.exports = class User extends Entity {
  /**
   * Set the mapping for this entity.
   *
   * @param {Mapping} mapping
   *
   * @see https://wetland.spoonx.org/API/mapping.html
   */
  static setMapping(mapping) {
    // Primary key
    mapping.forProperty('id').increments().primary();

    // Indexes
    mapping.index('username');
    mapping.index('email');

    // Fields
    mapping.field('username', {type: 'string'});
    mapping.field('email', {type: 'string'});
    mapping.field('emailConfirmed', {type: 'boolean', defaultTo: false});
    mapping.field('password', {type: 'string', nullable: false});
  }

  /**
   * Before creating the user, make sure the password gets hashed.
   *
   * @returns {Promise}
   */
  beforeCreate() {
    if (!this.password) {
      return;
    }

    return bcrypt.hash(this.password, 10).then(hash => {
      this.password = hash;
    });
  }

  /**
   * Before updating the user, make sure the password is hashed (unless provided as hash).
   *
   * @returns {Promise}
   */
  beforeUpdate() {
    if (!values.password) {
      return;
    }

    try {
      // check if the password is already hashed
      bcrypt.getRounds(values.password);
    } catch(e) {
      return bcrypt.hash(this.password, 10).then(hash => {
        this.password = hash;
      });
    }
  }

  /**
   * We don't want to expose the password to the world (even if it's hashed).
   *
   * @returns {{}}
   */
  toJSON() {
    // `.toObject()` is a method on `Entity`.
    // This gives us a POJO of our entity's data (minus relations).
    let values = this.toObject();

    delete values.password;

    return values;
  }
};
