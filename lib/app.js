var _      = require('lodash');
var path   = require('path');
var loader = require('./loaderOverride');

module.exports = {
  init: function(sails, cb) {
    try {
      require(path.join(process.cwd(), 'api/models/User'));
    } catch (e) {
      sails.models.user = require(path.join(__dirname, '../api/models/User'));

      if (sails.config.globals.models) {
        sails.on('hook:orm:loaded', function() {
          global.User = sails.models.user;
        });
      }
    }

    sails.services.authservice = require(path.join(__dirname, '../api/services/AuthService'));

    if (sails.config.globals.services) {
      global.AuthService = sails.services.authservice;
    }

    cb();
  },

  adaptSails: function(sails) {
    sails.config = _.merge(
      {},
      require(path.join(__dirname, '../config/auth')),
      require(path.join(__dirname, '../config/routes')),
      require(path.join(__dirname, '../config/policies')),
      sails.config
    );

    ['controllers', 'policies'].forEach(function(type) {
      var pathsConfig = sails.config.paths;
      var loaderName  = 'load' + type[0].toUpperCase() + type.substr(1);

      if (!_.isArray(pathsConfig[type])) {
        pathsConfig[type] = [pathsConfig[type]];
      }

      pathsConfig[type].push(path.resolve(__dirname, '../api', type));

      sails.modules[loaderName] = _.bind(loader(type), sails.modules);
    })
  }
};
