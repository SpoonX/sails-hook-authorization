module.exports.routes = {
  'POST /auth/login'         : 'AuthController.login',
  'POST /auth/signup'        : 'AuthController.signup',
  'GET /auth/activate/:token': 'AuthController.activate',
  'GET /auth/me'             : 'AuthController.me',
  'POST /auth/refresh-token' : 'AuthController.refreshToken'
};
