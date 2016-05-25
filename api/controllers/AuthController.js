"use strict";

let requestHelpers = require('request-helpers');

module.exports = {
  login: function (req, res) {
    let params = requestHelpers.secureParameters(['password'], req, true);
    let accessToken;
    let userQuery;

    // favor username above email
    if (!req.param('username') && !req.param('email')) {
      params.setMissing('username');
    }

    if (!params.isValid()) {
      return res.badRequest('missing_parameters', params.getMissing());
    }

    params = params.asObject();

    // grab user based on given field
    userQuery = {
      username: req.param('username').toLowerCase()
    };

    if (params.email) {
      userQuery = {
        email: req.param('email').toLowerCase()
      };
    }

    User.findOne(userQuery).then(function (user) {

      if (typeof user !== 'object') {
        return res.badRequest('invalid_credentials');
      }

      // verify password
      user.isPasswordValid(params.password, function (error, result) {
        if (error) {
          return res.negotiate(error);
        }

        if (!result) {
          return res.badRequest('invalid_credentials');
        }

        if (sails.config.jwt.requireAccountActivation && !user.emailConfirmed) {
          return res.badRequest('not_confirmed', 'user hasn\'t confirmed his email address yet');
        }

        // generate token
        accessToken = Auth.issueToken({user: user.id, username: user.username}, {expiresIn: sails.config.jwt.ttl.accessToken});

        res.ok({
          access_token : accessToken,
          // generated `refresh_token` based on the `iat` of the `access_token` and the `user.id` (security)
          refresh_token: Auth.issueToken(
            {unique   : Auth.decodeToken(accessToken).iat + '.' + user.id}, // `iat` means `issued at timestamp`
            {expiresIn: sails.config.jwt.ttl.refreshToken}
          )
        });
      });
    }).catch(res.negotiate);
  },

  me: function (req, res) {
    User.findOne(req.access_token.user)
      .then(function (user) {
        res.ok(user);
      })
      .catch(res.negotiate);
  },

  refreshToken : function (req, res) {
    let params = requestHelpers.secureParameters(['access_token', 'refresh_token'], req, true);

    if (!params.isValid()) {
      return res.badRequest('missing_parameters', params.getMissing());
    }

    params = params.asObject();

    Auth.validateRefreshToken(params.access_token, params.refresh_token, function (err, newTokens) {
      if (err) {
        return res.badRequest(err);
      }

      res.ok(newTokens);
    });
  },

  signup: function (req, res) {
    let params = requestHelpers.secureParameters(['username', 'email', 'password', 'passwordConfirm'], req, true);
    let config = sails.config.jwt;
    let accessToken;

    if (!params.isValid()) {
      return res.badRequest('missing_parameters', params.getMissing());
    }

    params = params.asObject();

    if (params.password !== params.passwordConfirm ) {
      return res.badRequest('password_mismatch');
    }

    params.username = params.username.toLowerCase();
    params.email    = params.email.toLowerCase();

    // check if username and email are unique
    User.findOne({
      or: [
        {username: params.username},
        {email   : params.email}
      ]
    }).then(function (userExists) {
      if (!userExists) {
        return;
      }

      if (userExists.username === params.username) {
        return res.badRequest('exists_username', 'username is already in use');
      }

      res.badRequest('exists_email', 'email is already in use');
    }).then(function () {

      // create user
      User.create({
        username: params.username,
        email   : params.email,
        password: params.password
      }).then(function(user) {

        if (config.requireAccountActivation) {
          if (config.sendAccountActivationEmail === 'function') {
            sails.config.jwt.sendAccountActivationEmail(user, sails.getBaseurl() + '/activate/' + Auth.issueToken({activate: user.id}));
          } else {
            sails.log.error('sails-hook-jwt-auhtorization:: An email function must be implemented through `sails.config.jwt.sendAccountActivationEmail` in order to enable the account activation feature. This will receive two parameters (user, activationUrl).');
          }

          return res.ok({status: 'ok'});
        }

        accessToken = Auth.issueToken({user: user.id, username: user.username}, {expiresIn: config.ttl.accessToken});

        res.ok({
          access_token : accessToken,
          refresh_token: Auth.issueToken(
            {unique   : Auth.decodeToken(accessToken).iat + '.' + user.id}, // `iat` means `issued at timestamp`
            {expiresIn: config.ttl.refreshToken}
          )
        });
      }).catch(res.badRequest);
    });
  },

  activate: function (req, res){
    let params = requestHelpers.secureParameters(['token'], req, true);

    Auth.verifyToken(params.token, function (err, decodedToken){
      if (err) {
        return res.badRequest('invalid_token');
      }

      User.findOne(decodedToken.activate).find(function (err, user){
        if (err) {
          return res.badRequest(err);
        }

        if (!user) {
          return res.badRequest('invalid_user');
        }

        user.emailConfirmed = true;
        user.save(function (err, savedUser){
          if (err) {
            return res.badRequest(err);
          }

          return res.ok({status: 'ok'});
        });
      }).catch(res.negotiate);
    });
  }
};
