/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import connection = require('./connection');
import model = require('./model');
import query = require('./query');
import schema = require('./schema');
import manager = require('./manager');
import cache = require('./cache');

export * from './connection';
export * from './model';
export * from './query';
export * from './schema';
export * from './manager';
export * from './cache';
export * from './define';
export const utils = require('./utils');

/**
 * 创建 Connection
 */
export function createConnection(options: connection.ConnectionOptions): connection.Connection {
  return new connection.Connection(options);
}

/**
 * 创建 Model
 */
export function createModel(options: model.ModelOptions): model.Model {
  return new model.Model(options);
}

/**
 * 创建 QueryBuilder
 */
export function createQueryBuilder(options: query.QueryBuilderOptions): query.QueryBuilder {
  return new query.QueryBuilder(options);
}

/**
 * 创建 Schema
 */
export function createSchema(options: schema.SchemaOptions): schema.Schema {
  return new schema.Schema(options);
}

/**
 * 创建 Manager
 */
export function createManager(options: manager.ManagerOptions): manager.Manager {
  return new manager.Manager(options);
}

/**
 * 创建 Cache
 */
export function createCache(options: cache.CacheOptions): cache.Cache {
  return new cache.Cache(options);
}
