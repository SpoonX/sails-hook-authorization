module.exports.routes = {
  'POST /auth/login'             : 'AuthController.login',
  'POST /auth/signup'            : 'AuthController.signup',
  'GET /auth/verify-email/:token': 'AuthController.verifyEmail',
  'GET /auth/me'                 : 'AuthController.me',
  'POST /auth/refresh-token'     : 'AuthController.refreshToken'
};
