"use strict";

module.exports = (req, res, next) => {
  try {
    var accessToken = sails.services.authservice.findAccessToken(req);
  } catch (error) {
    return error.error === 'invalid_token' ? res.forbidden(error) : res.negotiate(error);
  }

  if (accessToken === null) {
    return next();
  }

  // verify JWT token
  sails.services.authservice.verifyToken(accessToken).then(payload => {
    if (!payload.user) {
      return res.badRequest('wrong_token');
    }

    req.access_token = payload;

    return next();
  }).catch(error => {
    var message = 'invalid_token';

    if (error.name === 'TokenExpiredError') {
      message = 'expired_token';
    }

    res.forbidden(message);
  });
};
