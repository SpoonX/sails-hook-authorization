var async           = require('async');
var _               = require('lodash');
var buildDictionary = require('sails-build-dictionary');

/**
 * Custom loader that supports array paths
 *
 * @param {string} type E.g. "controllers"
 *
 * @returns {Function} The custom loader
 */
module.exports = function(type) {
  var controller = type === 'controllers';

  return function(cb) {
    async.reduce(sails.config.paths[type], {}, function(prev, curr, callback) {
      buildDictionary.optional({
        dirname           : curr,
        filter            : new RegExp('(.+)'+ (controller ? 'Controller' : '') +'\.(js|coffee|litcoffee)$'),
        replaceExpr       : controller && /Controller/,
        flattenDirectories: true,
        keepDirectoryPath : true
      }, function(error, things) {
        if (error) {
          return callback(error);
        }

        callback(null, _.merge(prev, things));
      });
    }, cb);
  }
};
