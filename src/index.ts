/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import connection = require("./connection");
import model = require("./model");
import query = require("./query");
import schema = require("./schema");
import manager = require("./manager");
import cache = require("./cache");

export * from "./connection";
export * from "./model";
export * from "./query";
export * from "./schema";
export * from "./manager";
export * from "./cache";
export const utils = require("./utils");

/**
 * 创建 Connection
 */
export function createConnection(options: connection.ConnectionOptions) {
  return new connection.Connection(options);
}

/**
 * 创建 Model
 */
export function createModel(options: model.ModelOptions) {
  return new model.Model(options);
}

/**
 * 创建 QueryBuilder
 */
export function createQueryBuilder(options: query.QueryBuilderOptions) {
  return new query.QueryBuilder(options);
}

/**
 * 创建 Schema
 */
export function createSchema(options: schema.SchemaOptions) {
  return new schema.Schema(options);
}

/**
 * 创建 Manager
 */
export function createManager(options: manager.ManagerOptions) {
  return new manager.Manager(options);
}

/**
 * 创建 Cache
 */
export function createCache(options: cache.CacheOptions) {
  return new cache.Cache(options);
}
