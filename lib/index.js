'use strict';

/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const Connection = require('./connection');

exports.Connection = Connection;
exports.createConnection = function createConnection(options) {
  return new Connection(options);
};
