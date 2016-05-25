"use strict";

let jwt = require('jsonwebtoken');

// todo: remove this function when https://github.com/auth0/node-jsonwebtoken/pull/172 is merged
jwt.refresh = function(token, expiresIn, secretOrPrivateKey, callback) {
    //TODO: check if token is not good, if so return error ie: no payload, not required fields, etc.

    let done;
    if (callback) {
        done = function() {
            let args = Array.prototype.slice.call(arguments, 0);
            return process.nextTick(function() {
                callback.apply(null, args);
            });
        };
    }
    else {
        done = function(err, data) {
            if (err) {
                console.log('err : ' + err);
                throw err;
            }
            return data;
        };
    }

    let header;
    let payload;

    if (token.header) {
        header = token['header'];
        payload = token['payload'];
    }
    else {
        payload = token;
    }

    let optionMapping = {
        exp: 'expiresIn',
        aud: 'audience',
        nbf: 'notBefore',
        iss: 'issuer',
        sub: 'subject',
        jti: 'jwtid',
        alg: 'algorithm'
    };
    let newToken;
    let obj = {};
    let options = {};

    for (let key in payload) {
        if (Object.keys(optionMapping).indexOf(key) === -1) {
            obj[key] = payload[key];
        }
        else {
            options[optionMapping[key]] = payload[key];
        }
    }

    if(header) {
        options.header = { };
        for (let key in header) {
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

module.exports.issueToken = function (payload, options) {
  if (!options) {
    options = {};
  }

  if (!options.expiresIn) {
    options.expiresIn = sails.config.jwt.ttl.accessToken;
  }

  return jwt.sign(payload, process.env.TOKEN_SECRET || sails.config.jwt.secret, options);
};

module.exports.verifyToken = function (token, cb) {
  jwt.verify(token, process.env.TOKEN_SECRET || sails.config.jwt.secret, {}, cb);
};

module.exports.decodeToken = function (token, options) {
  return jwt.decode(token, options);
};

module.exports.refreshToken = function (decodedToken, expiresIn, cb) {
  jwt.refresh(decodedToken, expiresIn, process.env.TOKEN_SECRET || sails.config.jwt.secret, cb);
};

module.exports.validateRefreshToken = function (accessToken, refreshToken, cb) {
  // decode token, keeping all the headers and signatures
  let decodedToken = Auth.decodeToken(accessToken, {complete: true}) || {};

  Auth.verifyToken(refreshToken, function (error, refreshToken) {
    if (error) {
      if (error.name === 'TokenExpiredError') {
        return cb('expired_refresh_token');
      }

      return cb('invalid_refresh_token');
    }

    // verify if the refreshToken is generated together with the token
    if (refreshToken.unique !== (decodedToken.payload.iat + '.' + decodedToken.payload.user)) {
      return cb('invalid_refresh_token');
    }

    delete decodedToken.payload.iat; // generate a new one

    Auth.refreshToken(decodedToken, sails.config.jwt.ttl.accessToken, function (err, accessToken) {
      if (err) {
        return cb(err);
      }

      cb(null, {
        access_token : accessToken,
        refresh_token: Auth.issueToken(
          {unique   : Auth.decodeToken(accessToken).iat + '.' + decodedToken.payload.user}, // `iat` means `issued at timestamp`
          {expiresIn: sails.config.jwt.ttl.refreshToken}
        )
      });
    });
  });
};
