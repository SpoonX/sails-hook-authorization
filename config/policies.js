module.exports.policies = {
  AuthController: {
    login       : [],
    me          : ['verifyToken', 'ensureToken'],
    refreshToken: [],
    signup      : []
  }
};
