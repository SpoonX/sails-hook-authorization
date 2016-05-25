/**
 * Policy which forces user to have a valid token.
 */
module.exports = function (req, res, next) {
  if (!req.access_token) {
    return res.forbidden('invalid_token', 'No Authorization header was found');
  }

  next();
};
