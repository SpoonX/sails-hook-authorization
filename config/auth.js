module.exports.auth = {

  sendVerificationEmail: (user, activateToken) => {
    sails.log.error('sails-hook-authorization:: An email function must be implemented through `sails.config.auth.sendVerificationEmail` in order to enable the email verification feature. This will receive two parameters (user, activationToken).');
  },

  // Options concerning a user's identity
  identityOptions: {

    // Property to use for login (one of "email" or "username").
    loginProperty: 'username',

    // Options for user signup. @see https://www.npmjs.com/package/request-helpers
    parameterBlueprint: ['username', {param: 'email', required: false}],

    // Whether or not you wish to require a user to validate their email address before being able to log in.
    requireEmailVerification: false
  },

  jwt: {
    payloadProperties: [],
    accessTokenTtl   : process.env.JWT_TOKEN_TTL || 86400,  // 1 day
    refreshTokenTtl  : process.env.JWT_REFRESH_TOKEN_TTL || 2592000, // 30 days
    secret           : process.env.JWT_SECRET || 'superSecretForDev'
  },

  wetland: false
};
