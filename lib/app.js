var _              = require('lodash');
var path           = require('path');
var loader         = require('./loaderOverride');
var AuthController = require('../api/controllers/AuthController');

module.exports = {
  init: function (sails, cb) {
    if (sails.config.auth.wetland) {
      sails.on('hook:wetland:loaded', function () {
        if (sails.wetland.getEntityManager().resolveEntityReference('User')) {
          return;
        }

        sails.hooks.wetland.registerEntity('User', require('../api/entity/User'));
      });
    } else {
      try {
        require(path.join(process.cwd(), 'api/models/User'));
      } catch (e) {
        sails.models.user = require(path.join(__dirname, '../api/models/User'));

        if (sails.config.globals.models) {
          sails.on('hook:orm:loaded', function () {
            global.User = sails.models.user;
          });
        }
      }
    }

    sails.services.authservice = require(path.join(__dirname, '../api/services/AuthService'));

    if (sails.config.globals.services) {
      global.AuthService = sails.services.authservice;
    }

    cb();
  },

  adaptSails: function (sails) {
    sails.config = _.merge(
      {},
      require(path.join(__dirname, '../config/auth')),
      require(path.join(__dirname, '../config/routes')),
      require(path.join(__dirname, '../config/policies')),
      sails.config
    );

    const toLoad = ['policies'];

    if (sails.registerAction) { // Test if it's sails v1 and use proper way to register actions from the authController
      for (actionName in AuthController) {
        if (AuthController.hasOwnProperty(actionName)) {
          sails.registerAction(AuthController[actionName], 'auth/' + actionName);
        }
      }
    } else {
      toLoad.push('controllers');
    }

    toLoad.forEach(function (type) {
      var pathsConfig = sails.config.paths;
      var loaderName  = 'load' + type[0].toUpperCase() + type.substr(1);

      if (!_.isArray(pathsConfig[type])) {
        pathsConfig[type] = [pathsConfig[type]];
      }

      pathsConfig[type].push(path.resolve(__dirname, '../api', type));

      sails.modules[loaderName] = _.bind(loader(type), sails.modules);
    });
  }
};
