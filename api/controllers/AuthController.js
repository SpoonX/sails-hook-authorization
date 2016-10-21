"use strict";
var requestHelpers = require('request-helpers');
var _              = require('lodash');

module.exports = {
  login: (req, res) => {
    var authService   = sails.services.authservice;
    var authConfig    = sails.config.auth;
    var loginProperty = authConfig.identityOptions.loginProperty;
    var params        = requestHelpers.secureParameters([{param: 'password', cast: 'string'}, loginProperty], req, true);
    var user, accessToken;

    if (!params.isValid()) {
      return res.badRequest('missing_parameters', params.getMissing());
    }

    params = params.asObject();

    sails.models.user['findOneBy' + _.upperFirst(loginProperty)](params[loginProperty]).populateAll()
      .then(foundUser => {
        if (typeof foundUser !== 'object') {
          throw 'invalid_credentials';
        }

        user = foundUser;

        return authService.validatePassword(params.password, foundUser.password);
      })
      .then(() => {
        if (authConfig.identityOptions.requireEmailVerification && !user.emailConfirmed) {
          throw 'email_not_confirmed';
        }

        accessToken = authService.issueTokenForUser(user);

        return res.ok({
          access_token : accessToken,
          refresh_token: authService.issueRefreshTokenForUser(accessToken)
        });
      })
      .catch(error => {
        if (typeof error === 'string') {
          return res.badRequest(error);
        }

        return res.negotiate(error);
      });
  },

  me: (req, res) => {
    User.findOne(req.access_token.user)
      .then(res.ok)
      .catch(res.negotiate);
  },

  refreshToken: (req, res) => {
    var params      = requestHelpers.secureParameters(['refresh_token'], req, true);
    var authService = sails.services.authservice;

    if (!params.isValid()) {
      return res.badRequest('missing_parameters', params.getMissing());
    }

    params = params.asObject();

    try {
      var accessToken = authService.findAccessToken(req);
    } catch (error) {
      return error.error === 'invalid_token' ? res.forbidden(error) : res.negotiate(error);
    }

    params.access_token = accessToken;

    authService
      .validateRefreshToken(params.access_token, params.refresh_token)
      .then(res.ok)
      .catch(res.badRequest);
  },

  signup: (req, res) => {
    var authConfig     = sails.config.auth;
    var loginProperty  = authConfig.identityOptions.loginProperty;
    var paramBlueprint = authConfig.identityOptions.parameterBlueprint.concat([{param: 'password', cast: 'string'}]);
    var params         = requestHelpers.secureParameters(paramBlueprint, req, true);
    var authService    = sails.services.authservice;
    var accessToken;

    if (!params.isValid()) {
      return res.badRequest('missing_parameters', params.getMissing());
    }

    params = params.asObject();

    sails.models.user['findOneBy' + _.upperFirst(loginProperty)](params[loginProperty]).then(userExists => {
      if (!userExists) {
        return params;
      }

      throw userExists.email === params.email ? 'exists_email' : 'exists_username';
    })
      .then(sails.models.user.create)
      .then(user => sails.models.user.findOne(user.id).populateAll().then())
      .then(user => {
        if (!authConfig.identityOptions.requireEmailVerification) {
          return user;
        }

        // return given password instead of encrypted one
        user.password = params.password;

        authConfig.sendVerificationEmail(user, authService.issueToken({activate: user.id}));

        delete user.password;

        return user;
      }).then((user) => {
        if (authConfig.identityOptions.requireEmailVerification) {
          return res.ok(user);
        }

        accessToken = authService.issueTokenForUser(user);

        res.ok({
          access_token : accessToken,
          refresh_token: authService.issueRefreshTokenForUser(accessToken)
        });
      }).catch(res.badRequest);
  },

  verifyEmail: (req, res) => {
    var params = requestHelpers.secureParameters(['token'], req, true);

    if (!params.isValid()) {
      return res.badRequest('missing_parameters', params.getMissing());
    }

    params = params.asObject();

    sails.services.authService.verifyToken(params.token)
      .then(decodedToken => {
        return sails.models.user.findOneId(decodedToken.activate);
      }).then(user => {
      if (!user) {
        throw 'invalid_user';
      }

      user.emailConfirmed = true;

      return user.save();
    }).then(() => {
      res.ok();
    }).catch(error => {
      if (typeof error === 'string') {
        return res.badRequest(error);
      }

      return res.negotiate(error);
    });
  }
};
