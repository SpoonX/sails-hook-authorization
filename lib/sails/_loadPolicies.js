/**
 * Load app policies
 *
 * @param {Object} options
 * @param {Function} cb
 */
var async           = require('async');
var _               = require('lodash');
var buildDictionary = require('sails-build-dictionary');

module.exports = function (cb) {
  async.reduce(sails.config.paths.policies, {} ,function (prev, curr, callback){
    buildDictionary.optional({
      dirname           : curr,
      filter            : /(.+)\.(js|coffee|litcoffee)$/,
      replaceExpr       : null,
      flattenDirectories: true,
      keepDirectoryPath : true
    }, function (err, policies){
      if (err) {
        return callback(err);
      }

      callback(null, _.merge(prev, policies));
    });
  }, cb);
};
