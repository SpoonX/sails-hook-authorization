"use strict";

const jwt    = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const _      = require('lodash');

// todo: remove this function when https://github.com/auth0/node-jsonwebtoken/pull/172 is merged
jwt.refresh = function(token, expiresIn, secretOrPrivateKey, callback) {
  //TODO: check if token is not good, if so return error ie: no payload, not required fields, etc.

  var done;
  if (callback) {
    done = function() {
      var args = Array.prototype.slice.call(arguments, 0);
      return process.nextTick(function() {
        callback.apply(null, args);
      });
    };
  } else {
    done = function(err, data) {
      if (err) {
        console.log('err : ' + err);
        throw err;
      }
      return data;
    };
  }

  var header;
  var payload;

  if (token.header) {
    header  = token['header'];
    payload = token['payload'];
  }
  else {
    payload = token;
  }

  var optionMapping = {
    exp: 'expiresIn',
    aud: 'audience',
    nbf: 'notBefore',
    iss: 'issuer',
    sub: 'subject',
    jti: 'jwtid',
    alg: 'algorithm'
  };
  var newToken;
  var obj           = {};
  var options       = {};

  for (var key in payload) {
    if (Object.keys(optionMapping).indexOf(key) === -1) {
      obj[key] = payload[key];
    }
    else {
      options[optionMapping[key]] = payload[key];
    }
  }

  if (header) {
    options.header = {};
    for (var key in header) {
      if (key !== 'typ') {    //don't care about typ -> always JWT
        if (Object.keys(optionMapping).indexOf(key) === -1) {
          options.header[key] = header[key];
        }
        else {
          options[optionMapping[key]] = header[key];
        }
      }
    }
  }
  else {
    console.log('No algorithm was defined for token refresh - using default');
  }

  if (!token.iat) {
    options['noTimestamp'] = true;
  }

  options['expiresIn'] = expiresIn;

  newToken = jwt.sign(obj, secretOrPrivateKey, options);
  return done(null, newToken);
};

class AuthService {
  constructor() {
    this.jwt            = jwt;
    this.payloadBuilder = this.defaultPayloadBuilder;
  }

  get config() {
    if (!this._config) {
      this._config = sails.config.auth.jwt;
    }

    return this._config;
  }

  get secret() {
    if (!this._secret) {
      this._secret = process.env.TOKEN_SECRET || this.config.secret;
    }

    return this._secret;
  }

  validatePassword(givenPassword, currentPassword) {
    return new Promise((resolve, reject) => {
      bcrypt.compare(givenPassword, currentPassword, (error, isValid) => {
        if (error) {
          return reject(error);
        }

        if (!isValid) {
          return reject('invalid_credentials');
        }

        return resolve(true);
      });
    });
  }

  issueTokenForUser(user) {
    return this.issueToken(this.payloadBuilder(user, {user: user.id, username: user.username}));
  }

  issueToken(payload, options) {
    options           = options || {};
    options.expiresIn = options.expiresIn || this.config.accessTokenTtl;

    return this.jwt.sign(payload, this.secret, options);
  }

  issueRefreshTokenForUser(token) {
    var payload = this.decodeToken(token);

    return this.issueToken({unique: payload.iat + '.' + payload.user}, {expiresIn: this.config.refreshTokenTtl});
  }

  verifyToken(testToken) {
    return new Promise((resolve, reject) => {
      this.jwt.verify(testToken, this.secret, (error, token) => {
        if (error) {
          return reject(error);
        }

        resolve(token);
      });
    });
  }

  decodeToken(token, options) {
    return this.jwt.decode(token, options);
  }

  refreshToken(decodedToken, expiresIn) {
    return new Promise((resolve, reject) => {
      this.jwt.refresh(decodedToken, expiresIn, this.secret, (error, token) => {
        if (error) {
          return reject(error);
        }

        resolve(token);
      });
    });
  }

  /**
   * Find the access token on req (convenience method).
   *
   * @param {Request} req
   * @return {null|{}}
   */
  findAccessToken(req) {
    var accessToken;

    // check authorization headers
    if (req.headers && req.headers.authorization) {
      var parts = req.headers.authorization.split(' ');

      if (parts.length !== 2) {
        throw {error: 'invalid_token', details: 'Format is Authorization: Bearer [access_token]'};
      }

      var scheme      = parts[0];
      var credentials = parts[1];

      if (/^Bearer$/i.test(scheme)) {
        accessToken = credentials;
      }
    } else if (req.param('access_token')) {
      accessToken = req.param('access_token');
    } else {
      // request didn't contain required JWT token
      return null;
    }

    req.body && delete req.body.access_token;
    req.query && delete req.query.access_token;

    return accessToken;
  }

  validateRefreshToken(accessToken, refreshToken) {
    var decodedToken = this.decodeToken(accessToken, {complete: true}) || {};

    if (_.isEmpty(decodedToken)) {
      throw 'invalid_access_token';
    }

    return this.verifyToken(refreshToken)
      .then(refreshToken => {
        // verify if the refreshToken is generated together with the token
        if (refreshToken.unique !== (decodedToken.payload.iat + '.' + decodedToken.payload.user)) {
          throw 'invalid_refresh_token';
        }

        delete decodedToken.payload.iat; // generate a new one

        return this.refreshToken(decodedToken, this.config.accessTokenTtl);
      })
      .then(accessToken => {
        return {
          access_token : accessToken,
          refresh_token: this.issueRefreshTokenForUser(accessToken)
        };
      })
      .catch(error => {
        throw error.name === 'TokenExpiredError' ? 'expired_refresh_token' : 'invalid_refresh_token';
      });
  }

  defaultPayloadBuilder(user, payload) {
    payload = payload || {};

    this.config.payloadProperties.forEach(property => {
      if (typeof property === 'string') {
        return payload[property] = user[property];
      }

      let propertyKey      = Object.getOwnPropertyNames(property)[0];
      let properties       = property[propertyKey];
      payload[propertyKey] = {};

      if (!user[propertyKey]) {
        return;
      }

      properties.forEach(nestedProperty => {
        payload[propertyKey][nestedProperty] = user[propertyKey][nestedProperty];
      });
    });

    return payload;
  }
}

module.exports = new AuthService();
