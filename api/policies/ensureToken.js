/**
 * Policy which forces user to have a valid token.
 */
module.exports = (req, res, next) => {
  if (!req.access_token) {
    return res.forbidden('invalid_token', 'No valid Authorization token found in headers.');
  }

  next();
};
