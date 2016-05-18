module.exports.routes = {
  'POST /login'              : 'AuthController.login',
  'POST /signup'             : 'AuthController.signup',
  'GET /auth/activate/:token': 'AuthController.activate',
  'GET /auth/me'             : 'AuthController.me',
  'POST /auth/refresh-token' : 'AuthController.refreshToken'
};