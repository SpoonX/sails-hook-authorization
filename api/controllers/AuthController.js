"use strict";

var requestHelpers = require('request-helpers');
var _              = require('lodash');

module.exports = {
  login: (req, res) => {
    var authService   = sails.services.authservice;
    var authConfig    = sails.config.auth;
    var loginProperty = authConfig.loginProperty;
    var params        = requestHelpers.secureParameters(['password', loginProperty], req, true);
    var user, accessToken;

    if (!params.isValid()) {
      return res.badRequest('missing_parameters', params.getMissing());
    }

    params = params.asObject();

    sails.models.user['findOneBy' + _.upperFirst(loginProperty)](params[loginProperty])
      .then(foundUser => {
        if (typeof foundUser !== 'object') {
          throw 'invalid_credentials';
        }

        user = foundUser;

        return authService.validatePassword(params.password, foundUser.password);
      })
      .then(() => {
        if (authConfig.requireEmailVerification && !user.emailConfirmed) {
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
    var params = requestHelpers.secureParameters(['access_token', 'refresh_token'], req, true);

    if (!params.isValid()) {
      return res.badRequest('missing_parameters', params.getMissing());
    }

    params = params.asObject();

    sails.services.authservice
      .validateRefreshToken(params.access_token, params.refresh_token)
      .then(res.ok)
      .catch(res.badRequest);
  },

  signup: (req, res) => {
    var authConfig     = sails.config.auth;
    var loginProperty  = authConfig.loginProperty;
    var paramBlueprint = [loginProperty, 'password', {param: (loginProperty === 'email')? 'username' : 'email', required: false}]
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
    .then(user => {
      if (!authConfig.requireEmailVerification) {
        return user;
      }

      authConfig.sendVerificationEmail(user, sails.getBaseurl() + '/auth/verify-email/' + authService.issueToken({activate: user.id}));

      return res.ok();
    }).then((user) => {
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
