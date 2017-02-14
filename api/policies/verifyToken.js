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
    req.access_token = payload;

    return next();
  }).catch(error => {
    if (error.name === 'TokenExpiredError') {
      return res.forbidden('expired_token');
    }

    res.forbidden('invalid_token');
  });
};
