/**
 * @leizm/mysql
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import * as connection from "./connection";
import * as table from "./table";
import * as query from "./query";
import * as schema from "./schema";
import * as manager from "./manager";
import * as cache from "./cache";
import * as utils from "./utils";

export * from "./connection";
export * from "./table";
export * from "./query";
export * from "./schema";
export * from "./manager";
export * from "./cache";
export * from "./define";
export { utils };

/**
 * 创建 Connection
 */
export function createConnection(
  options: connection.ConnectionOptions
): connection.Connection {
  return new connection.Connection(options);
}

/**
 * 创建 Table
 */
export function createTable(options: table.TableOptions): table.Table {
  return new table.Table(options);
}

/**
 * 创建 QueryBuilder
 */
export function createQueryBuilder(
  options: query.QueryBuilderOptions
): query.QueryBuilder {
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
export function createManager(
  options: manager.ManagerOptions
): manager.Manager {
  return new manager.Manager(options);
}

/**
 * 创建 Cache
 */
export function createCache(options: cache.CacheOptions): cache.Cache {
  return new cache.Cache(options);
}
