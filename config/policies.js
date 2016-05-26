module.exports.policies = {
  AuthController: {
    login       : true,
    me          : ['verifyToken', 'ensureToken'],
    refreshToken: true,
    signup      : true
  }
};
