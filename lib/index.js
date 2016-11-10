'use strict';

/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const Connection = require('./connection');
const Model = require('./model');
const QueryBuilder = require('./query');
const Schema = require('./schema');
const utils = require('./utils');

exports.Connection = Connection;
exports.createConnection = function createConnection(options) {
  return new Connection(options);
};

exports.Model = Model;
exports.createModel = function createModel(options) {
  return new Model(options);
};

exports.QueryBuilder = QueryBuilder;
exports.createQueryBuilder = function createQueryBuilder(options) {
  return new QueryBuilder(options);
};

exports.Schema = Schema;
exports.createSchema = function createSchema(options) {
  return new Schema(options);
};

exports.utils = utils;

