"use strict";
var requestHelpers = require('request-helpers');
var _              = require('lodash');

module.exports = {
  login: (req, res) => {
    var authService   = sails.services.authservice;
    var authConfig    = sails.config.auth;
    var loginProperty = authConfig.identityOptions.loginProperty;
    var populate      = authConfig.identityOptions.populate;
    var params        = requestHelpers.secureParameters([{param: 'password', cast: 'string'}, loginProperty], req, true);
    var user, accessToken, findUser;

    if (!params.isValid()) {
      return res.badRequest('missing_parameters', params.getMissing());
    }

    params = params.asObject();

    if (authConfig.wetland) {
      findUser = req.getRepository(sails.models.user.Entity).findOne({[loginProperty]: params[loginProperty]}, {populate: populate});
    } else {
      findUser = sails.models.user.findOne({[loginProperty]: params[loginProperty]});

      if (true === populate) {
        findUser.populateAll();
      } else if (Array.isArray(populate)) {
        populate.forEach(function (relation) {
          findUser.populate(relation);
        })
      } else if (typeof populate === 'string') {
        findUser.populate(populate);
      }
    }

    findUser
      .then(foundUser => {
        if (typeof foundUser !== 'object' || !foundUser) {
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
    let model = sails.config.auth.wetland ? req.getRepository(sails.models.user.Entity) : sails.models.user;

    model.findOne(req.access_token.user)
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
    var populate       = authConfig.identityOptions.populate;
    var authService    = sails.services.authservice;
    var accessToken, manager, findUser, UserEntity;

    if (!params.isValid()) {
      return res.badRequest('missing_parameters', params.getMissing());
    }

    params = params.asObject();



    if (authConfig.wetland) {
      UserEntity = sails.models.user.Entity;
      manager    = req.getManager();
      findUser   = manager.getRepository(UserEntity).findOne({[loginProperty]: params[loginProperty]});
    } else {
      findUser = sails.models.user.findOne({[loginProperty]: params[loginProperty]});
    }

    findUser
      .then(userExists => {
        if (!userExists) {
          return params;
        }

        throw userExists.email === params.email && loginProperty === 'email' ? 'exists_email' : 'exists_username';
      })
      .then(newUser => {
        if (authConfig.wetland) {
          let newRecord = req.wetland.getPopulator(manager).assign(UserEntity, newUser);

          return manager.persist(newRecord).flush().then(() => newRecord);
        }

        return sails.models.user.create(newUser).meta({fetch: true}).then();
      })
      .then(user => {
        let findUser;

        if (authConfig.wetland) {
          findUser = manager.getRepository(UserEntity).findOne(user.id, {populate: populate});
        } else {
          findUser = sails.models.user.findOne(user.id);

          if (true === populate) {
            findUser.populateAll();
          } else if (Array.isArray(populate)) {
            populate.forEach(function(relation) {
              findUser.populate(relation);
            })
          } else if (typeof populate === 'string') {
            findUser.populate(populate);
          }

          findUser.then();
        }

        return findUser;
      })
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

    var manager;

    params = params.asObject();

    sails.services.authService.verifyToken(params.token)
      .then(decodedToken => {
        if (sails.config.auth.wetland) {
          manager = req.getManager();
          return manager.getRepository(sails.models.user.Entity).findOne(decodedToken.activate);
        }
        return sails.models.user.findOne(decodedToken.activate);
      }).then(user => {
      if (!user) {
        throw 'invalid_user';
      }

      user.emailConfirmed = true;

      if (sails.config.auth.wetland) {
        return manager.flush();
      }

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
