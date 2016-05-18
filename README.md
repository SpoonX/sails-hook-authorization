# sails-hook-authorization
Hook that provides jwt authentication sails-compatible scheme, such as policies, routes, controllers, services.
Based on https://github.com/saviogl/sails-hook-jwt-auth

# Installation

```javascript
npm install sails-hook-authorization --save
```

# Service
This module globally expose a service which integrates with the jsonwebtoken (https://github.com/auth0/node-jsonwebtoken) and provide the interface to apply the jwt specification (http://self-issued.info/docs/draft-ietf-oauth-json-web-token.html).

```javascript
module.exports.issueToken = function(payload, options) {};

module.exports.verifyToken = function(token, callback) {};

module.exports.decodeToken = function(token, options) {};

module.exports.refreshToken = function(decodedToken, expiresIn, callback) {};

// renews the `access_token` based on the `refresh_token`
module.exports.validateRefreshToken = function(accessToken, refreshToken, callback) {};
```

# Policy
The `verifyToken.js` and `ensureToken.js` policies are just like any other Sails policy and can be applied as such. It's responsible for parsing the token from the incoming request and validating it's state.

Use it as you would use any other sails policy to enable jwt authentication restriction to your `Controllers/Actions`:

```javascript
module.exports.policies = {
  ...
  'AuthController': ['verifyToken', 'ensureToken'],
  ...
};
```

# Model
This hook sets up a basic `User` model with some defaults attributes required to implement the jwt authentication
scheme such as `username`, `email` and `emailConfirmed`. The `User` model can be extended with any property you want by defining it in your own Sails project.

# Routes
These are the routes provided by this hook:

```javascript
module.exports.routes = {
  'POST /login'              : 'AuthController.login',
  'POST /signup'             : 'AuthController.signup',
  'GET /auth/activate/:token': 'AuthController.activate',
  'GET /auth/me'             : 'AuthController.me',
  'POST /auth/refresh-token' : 'AuthController.refreshToken'
};
```

## POST /login
The request to this route `/login` must be sent with these body parameters:

```javascript
{
  email   : 'email@test.com', // or username
  password: 'test123'
}
```

The response:

```javascript
{
  access_token : 'jwt_access_token',
  refresh_token: 'jwt_refresh_token'
}
```

Make sure that you provide the acquired token in every request made to the protected endpoints, as query parameter `access_token` or as an HTTP request `Authorization` header `Bearer TOKEN_VALUE`.

The default TTL of the `access_token` is 1 day, `refresh_token` is 30 days.
If the `access_token` is expired you can expect the `expired_token` error.


## POST /signup
The request to this route `/signup` must be sent with these body parameters:

```javascript
{
  username       : 'test',
  email          : 'email@test.com',
  password       : 'test123',
  passwordConfirm: 'test123'
}
```

If account activation feature is disabled, the response will be the same as the `/login`.

```javascript
{
  access_token : 'new jwt access token',
  refresh_token: 'new jwt refresh token'
}
```

If it's enabled you will get the following response:

```javascript
{
  status: 'ok'
}
```

## GET /auth/activate/:token
### Account Activation
This feature is off by default and to enable it you must override the `requireAccountActivation` configuration and implement the function `sendAccountActivationEmail`:

```javascript
module.exports.jwt = {
  secret: process.env.JWT_SECRET || 'superSecretForDev',

  requireAccountActivation  : false,
  sendAccountActivationEmail: function (user, activateUrl) {
    sails.log.error('sails-hook-authorization:: An email function must be implemented through `sails.config.jwt.sendAccountActivationEmail` in order to enable the account activation feature. This will receive two parameters (user, activationLink).');
  },

  // seconds to be valid
  ttl: {
    accessToken : process.env.JWT_TOKEN_TTL || 86400,  // 1 day
    refreshToken: process.env.JWT_REFRESH_TOKEN_TTL || 2592000 // 30 days
  }
};

```

## GET /auth/me
Returns the user, token protected area.

## POST /auth/refresh-token
Refreshes the `access_token` based on the `refresh_token`.
If the `refresh_token` is expired it will return `expired_refresh_token` and the user must login through `/login`

The request:

```javascript
{
  access_token : 'jwt access token',
  refresh_token: 'jwt refresh token'
}
```

The response:

```javascript
{
  access_token : 'new jwt access token',
  refresh_token: 'new jwt refresh token'
}
```
