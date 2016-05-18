var jwtHook = require('./lib/app.js');

module.exports = function (sails) {
    jwtHook.adaptSails(sails);

    return {
      defaults: {},

      initialize: function(cb) {
        jwtHook.init(sails);

        return cb();
      }
    };
};