/**
 * Load app controllers
 *
 * @param {Object} options
 * @param {Function} cb
 */
var async           = require('async');
var _               = require('lodash');
var buildDictionary = require('sails-build-dictionary');

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
      }, function(err, things) {
        if (err) {
          return callback(err);
        }

        callback(null, _.merge(prev, things));
      });
    }, cb);
  }
};
