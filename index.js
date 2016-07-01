'use strict';

var shimmer = require('shimmer');


module.exports = function patchMPromise(ns, _mongoose) {

  //If there are multiple mongoose versions in the dependency tree, then the `require('mongodb')` could contain differnent objects
  // This allows users to explicitly pass a `mongoose` object to bind. 
  var mongoose = _mongoose || require('mongoose');
  if (typeof ns.bind !== 'function') {
    throw new TypeError("must include namespace to patch Mongoose against");
  }

  shimmer.wrap(mongoose.Mongoose.prototype.Promise.prototype, 'on', function (original) {
    return function(event, callback) {
      callback = ns.bind(callback);
      return original.call(this, event, callback);
    };
  });

  shimmer.wrap(mongoose.Mongoose.prototype.Query.prototype, 'exec', function (original) {
    return function(op, callback) {
      if (typeof op == 'function') op = ns.bind(op);
      if (typeof callback == 'function') callback = ns.bind(callback);
      return original.call(this, op, callback);
    };
  });

  shimmer.wrap(mongoose.Mongoose.prototype.Query.base, '_wrapCallback', function (original) {
    return function(method, callback, queryInfo) {
      if (typeof callback == 'function') callback = ns.bind(callback);
      return original.call(this, method, callback, queryInfo);
    };
  });
};
