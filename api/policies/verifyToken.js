"use strict";

module.exports = (req, res, next) => {
  var accessToken;

  // check authorization headers
  if (req.headers && req.headers.authorization) {
    var parts = req.headers.authorization.split(' ');

    if (parts.length !== 2) {
      return res.forbidden('invalid_token', 'Format is Authorization: Bearer [access_token]');
    }

    var scheme      = parts[0];
    var credentials = parts[1];

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
  sails.service.authservice.verifyToken(accessToken).then(token => {
    req.access_token = token;

    return next();
  }).catch(error => {
    if (error.name === 'TokenExpiredError') {
      return res.forbidden(res, 'expired_token');
    }

    res.forbidden(res, 'invalid_token');
  });
};
