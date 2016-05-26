module.exports.auth = {
  secret                  : process.env.JWT_SECRET || 'superSecretForDev',
  loginProperty           : 'email',
  requireEmailVerification: false,
  sendVerificationEmail   : (user, activateUrl) => {
    sails.log.error('sails-hook-authorization:: An email function must be implemented through `sails.config.auth.sendVerificationEmail` in order to enable the email verification feature. This will receive two parameters (user, activationLink).');
  },

  // seconds to be valid
  ttl: {
    accessToken : process.env.JWT_TOKEN_TTL || 86400,  // 1 day
    refreshToken: process.env.JWT_REFRESH_TOKEN_TTL || 2592000 // 30 days
  }
};
