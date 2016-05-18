"use strict";

module.exports = function (req, res, next) {
  let accessToken;

  // check authorization headers
  if (req.headers && req.headers.authorization) {
    let parts = req.headers.authorization.split(' ');

    if (parts.length !== 2) {
      return res.forbidden('invalid_token', 'Format is Authorization: Bearer [access_token]');
    }

    let scheme      = parts[0];
    let credentials = parts[1];

    if (/^Bearer$/i.test(scheme)) {
      accessToken = credentials;
    }

  // check if token is set, if refresh_token is given we can assume that the token is expired
  } else if (req.param('access_token') && !req.param('refresh_token')) {
    accessToken = req.param('access_token');
  } else {
    // request didn't contain required JWT token
    return next();
  }

  req.body && delete req.body.access_token;
  req.query && delete req.query.access_token;

  // verify JWT token
  Auth.verifyToken(accessToken, function (error, token) {
    if (error) {
      if (error.name === 'TokenExpiredError') {
        return res.forbidden(res, 'expired_token');
      }

      return res.forbidden(res, 'invalid_token');
    }

    // Store user id to request object
    req.access_token = token;

    return next();
  });
};
