module.exports.jwt = {
  secret: process.env.JWT_SECRET || 'superSecretForDev',

  requireAccountActivation  : false,
  sendAccountActivationEmail: function (user, activateUrl) {
    sails.log.error('sails-hook-jwt:: An email function must be implemented through `sails.config.jwt.sendAccountActivationEmail` in order to enable the account activation feature. This will receive two parameters (user, activationLink).');
  },

  // seconds to be valid
  ttl: {
    accessToken : process.env.JWT_TOKEN_TTL || 86400,  // 1 day
    refreshToken: process.env.JWT_REFRESH_TOKEN_TTL || 2592000 // 30 days
  }
};
