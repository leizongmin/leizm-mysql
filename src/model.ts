/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import assert = require("assert");
import utils = require("./utils");
import connection = require("./connection");
import cache = require("./cache");
import schema = require("./schema");
import query = require("./query");
import { Callback, KVObject } from "./define";

export type FieldName = string | string[];

export interface ModelBaseOptions extends schema.SchemaOptions {
  /**
   * 表名
   */
  table: string;
  /**
   * 主键
   */
  primary?: FieldName;
  /**
   * 主键是否自增
   */
  autoIncrement?: boolean;
  /**
   * 唯一键
   */
  uniques?: FieldName[];
}

export interface ModelOptions extends ModelBaseOptions {
  /**
   * Connection 实例
   */
  connection: connection.Connection;
  /**
   * Cache 实例
   */
  cache: cache.Cache;
}

export interface ModelQueryOptions {
  /**
   * 是否自动格式化查询结果
   */
  format?: boolean;
  /**
   * 回调函数
   */
  callback?: (err: Error | null, ret: any, callback: Callback<any>) => void;
}

export class Model {

  /** Connection 实例 */
  public readonly connection: connection.Connection;
  /** Cache 实例 */
  public readonly cache: cache.Cache;
  /** 表名 */
  public readonly tableName: string;
  /** 主键 */
  public readonly primaryKey: string[];
  /** 主键是否自增 */
  public readonly primaryKeyAutoIncrement: boolean;
  /** 唯一键列表 */
  public readonly uniqueKeyList: string[][];
  /** 主键和唯一键列表 */
  public readonly importantFields: string[];
  /** Schema 实例 */
  public readonly schema: schema.Schema;

  /**
   * 创建 Model
   */
  constructor(options: ModelOptions) {
    assert.ok(options, `missing options`);

    assert.ok(utils.isConnectionInstance(options.connection), `connection must be an Connection instance`);
    this.connection = options.connection;

    assert.ok(utils.isCacheInstance(options.cache), `cache must be an Cache instance`);
    this.cache = options.cache;

    assert.ok(options.table, `must provide table name`);
    assert.ok(typeof options.table === "string", `table name must be a string`);
    this.tableName = options.table;

    const importantFields = new Set<string>();

    // 主键
    if (options.primary) {
      assert.ok(typeof options.primary === "string" || Array.isArray(options.primary), `primary must be a string or array`);
      if (Array.isArray(options.primary)) {
        options.primary.forEach(name => {
          assert.ok(typeof name === "string", `every item of primary must be a string`);
        });
        // 包装 key 是按顺序排列的
        this.primaryKey = options.primary.slice().sort();
      } else {
        this.primaryKey = [ options.primary ];
      }
      this.primaryKey.forEach(f => importantFields.add(f));
    }

    // 主键是否自增
    if (options.autoIncrement) {
      assert.equal(this.primaryKey.length, 1, `invalid primary key number when autoIncrement=true`);
      this.primaryKeyAutoIncrement = true;
    } else {
      this.primaryKeyAutoIncrement = false;
    }

    // 唯一键列表
    if (options.uniques) {
      assert.ok(Array.isArray(options.uniques), `uniques must be an array`);
      assert.ok(options.uniques.length > 0, `uniques must have less than 1 item`);
      this.uniqueKeyList = options.uniques.map(item => {
        assert.ok(typeof item === "string" || Array.isArray(item) );
        if (Array.isArray(item)) {
          return item.sort();
        } else {
          return [ item ];
        }
      });
      this.uniqueKeyList.forEach(fields => fields.forEach(f => importantFields.add(f)));
    }

    // 主键和唯一键列表
    this.importantFields = Array.from(importantFields).sort();

    this.schema = new schema.Schema(options);
  }

  /**
   * 从一行数据中获取主键缓存名称
   * @param data 键值对数据
   * @param strict 是否严格检查每个键的数据都存在，如果为 true 且键不存在时抛出异常，否则返回 undefined
   */
  public getPrimaryCacheKey(data: KVObject, strict?: boolean): string {
    assert.ok(this.primaryKey, `table "${ this.tableName }" does not have primary key`);
    let isEveryKeyExists = true;
    const key = this.primaryKey.map(name => {
      isEveryKeyExists = isEveryKeyExists && name in data;
      if (strict) {
        assert.ok(isEveryKeyExists, `missing primary key "${ name }" in this data row`);
      }
      return `${ name }:${ data[name] }`;
    }).join(":");
    return isEveryKeyExists ? `${ this.tableName }:r:${ key }` : "";
  }

  /**
   * 从一行数据中获取唯一键缓存名称列表
   * @param data 键值对数据
   */
  public getUniqueCacheKeys(data: KVObject): string[] {
    const list: string[] = [];
    if (Array.isArray(this.uniqueKeyList)) {
      this.uniqueKeyList.forEach(fields => {
        if (utils.everyFieldExists(data, fields)) {
          list.push(fields.map(f => `${ this.tableName }:u:${ f }:${ data[f] }`).join(":"));
        }
      });
    }
    return list;
  }

  /**
   * 从一行数据中保留主键的数据
   * @param data 键值对数据
   */
  public keepPrimaryFields(data: KVObject): KVObject {
    assert.ok(this.primaryKey, `table "${ this.tableName }" does not have primary key`);
    const ret = {};
    for (const name of this.primaryKey) {
      assert.ok(name in data, `missing primary key "${ name }" in this data row`);
      ret[name] = data[name];
    }
    return ret;
  }

  /**
   * 从一行数据中保留唯一键的数据，如果有多组唯一键则仅返回第一个匹配的唯一键
   * @param data 键值对数据
   */
  public keepUniqueFields(data: KVObject): KVObject {
    assert.ok(this.uniqueKeyList, `table "${ this.tableName }" does not have unique key`);
    for (const fields of this.uniqueKeyList) {
      if (utils.everyFieldExists(data, fields)) {
        const ret = {};
        for (const f of fields) {
          ret[f] = data[f];
        }
        return ret;
      }
    }
    throw new Error(`missing unique key in this data row, must includes one of ${ this.uniqueKeyList.map(keys => keys.join(",")).join(" | ") }`);
  }

  /**
   * 创建 Query
   */
  public query(options: ModelQueryOptions = {}): query.QueryBuilder {
    return new query.QueryBuilder({
      table: this.tableName,
      exec: (sql, callback) => {
        const cb = utils.wrapCallback(callback);
        this.connection.query(sql, (err, ret) => {
          // 格式化输出
          if (ret && options.format) {
            if (Array.isArray(ret)) {
              ret = this.schema.formatOutputList(ret);
            } else {
              ret = this.schema.formatOutput(ret);
            }
          }
          if (!options.callback) {
            return cb(err, ret);
          }
          // 处理回调结果
          options.callback(err, ret, cb);
        });
        return cb.promise;
      },
    });
  }

  /**
   * 查询数据
   */
  public find(): query.QueryBuilder {
    assert.equal(arguments.length, 0, `expected 0 argument for find() but got ${ arguments.length }`);
    return this.query({ format: true }).select("*");
  }

  /**
   * 查询一行数据
   */
  public findOne(): query.QueryBuilder {
    assert.equal(arguments.length, 0, `expected 0 argument for findOne() but got ${ arguments.length }`);
    return this.query({
      format: true,
      callback(err, ret, callback) {
        if (err) {
          return callback(err);
        }
        callback(null, ret[0]);
      },
    }).select("*").limit(1);
  }

  /**
   * 查询数量
   */
  public count(): query.QueryBuilder {
    assert.equal(arguments.length, 0, `expected 0 argument for count() but got ${ arguments.length }`);
    return this.query({
      format: false,
      callback(err, ret, callback) {
        if (err) {
          return callback(err);
        }
        callback(null, ret[0].c);
      },
    }).count("c").limit(1);
  }

  /**
   * 更新数据
   * @param update 键值对数据
   */
  public update(update: KVObject): query.QueryBuilder;
  /**
   * 更新数据
   * @param update SQL 语句
   */
  public update(update: string): query.QueryBuilder;
  /**
   * 更新数据
   * @param update SQL 模板语句
   * @param values 模板参数，如 { a: 123 }
   */
  public update(update: string, values: KVObject): query.QueryBuilder;
  /**
   * 更新数据
   * @param update SQL 模板语句
   * @param values 模板参数，如 [ 123 ]
   */
  public update(update: string, values: any[]): query.QueryBuilder;

  public update(update: KVObject | string, values?: KVObject | any[]): query.QueryBuilder {
    assert.ok(arguments.length === 1 || arguments.length === 2, `expected 1 or 2 argument for update() but got ${ arguments.length }`);
    assert.ok(typeof values !== "function", `update() does not expected a callback function, maybe this is what you want: update(data).exec(callback)`);
    // 格式化输入
    if (typeof update === "string") {
      if (values) {
        return this.query({ format: false }).update(update, values);
      }
      return this.query({ format: false }).update(update);
    }
    update = this.schema.formatInput(update);
    return this.query({ format: false }).update(update);
  }

  /**
   * 更新一行数据
   * @param update 键值对数据
   */
  public updateOne(update: KVObject): query.QueryBuilder;
  /**
   * 更新一行数据
   * @param update SQL 语句
   */
  public updateOne(update: string): query.QueryBuilder;
  /**
   * 更新一行数据
   * @param update SQL 模板语句
   * @param values 模板参数，如 { a: 123 }
   */
  public updateOne(update: string, values: KVObject): query.QueryBuilder;
  /**
   * 更新一行数据
   * @param update SQL 模板语句
   * @param values 模板参数，如 [ 123 ]
   */
  public updateOne(update: string, values: any[]): query.QueryBuilder;

  public updateOne(update: KVObject | string, values?: KVObject | any[]): query.QueryBuilder {
    assert.ok(arguments.length === 1 || arguments.length === 2, `expected 1 or 2 argument for updateOne() but got ${ arguments.length }`);
    assert.ok(typeof values !== "function", `updateOne() does not expected a callback function, maybe this is what you want: updateOne(data).exec(callback)`);
    // 格式化输入
    if (typeof update === "string") {
      if (values) {
        return this.query({ format: false }).update(update, values).limit(1);
      }
      return this.query({ format: false }).update(update).limit(1);
    }
    update = this.schema.formatInput(update);
    return this.query({ format: false }).update(update);
  }

  /**
   * 删除数据
   */
  public delete(): query.QueryBuilder {
    assert.equal(arguments.length, 0, `expected 0 argument for delete() but got ${ arguments.length }`);
    return this.query({ format: false }).delete();
  }

  /**
   * 删除一行数据
   */
  public deleteOne(): query.QueryBuilder {
    assert.equal(arguments.length, 0, `expected 0 argument for deleteOne() but got ${ arguments.length }`);
    return this.query({ format: false }).delete().limit(1);
  }

  /**
   * 插入数据
   * @param data 键值对数据
   */
  public insert(data: KVObject): query.QueryBuilder;
  /**
   * 插入数据
   * @param data 键值对数据数组
   */
  public insert(data: KVObject[]): query.QueryBuilder;

  public insert(data: KVObject | KVObject[]): query.QueryBuilder {
    assert.equal(arguments.length, 1, `expected 1  argument for insert() but got ${ arguments.length }`);
    // 格式化输入
    if (Array.isArray(data)) {
      data = this.schema.formatInputList(data);
    } else {
      data = [ this.schema.formatInput(data) ];
    }
    // 检查是否包含主键（仅当主键不是自增时）
    if (!this.primaryKeyAutoIncrement) {
      for (const item of (data as KVObject[])) {
        for (const key of this.primaryKey) {
          if (typeof item[key] === "undefined") {
            throw new Error(`missing primary key "${ key }"`);
          }
        }
      }
    }
    return this.query({ format: false }).insert(data);
  }

  /**
   * 增加指定字段的值
   * @param data 键值对数据，如：{ count: 1 }
   */
  public incr(data: KVObject): query.QueryBuilder {
    assert.equal(arguments.length, 1, `expected 1  argument for incr() but got ${ arguments.length }`);
    const q = this.query({ format: false }).update();
    for (const name in data) {
      q.set("?? = ?? + (?)", [ name, name, data[name] ]);
    }
    return q;
  }

  /**
   * 执行 SQL 查询
   * @param sql SQL 语句
   */
  public sql(sql: string): query.QueryBuilder;
  /**
   * 执行 SQL 查询
   * @param sql SQL 语句模板
   * @param values 模板参数，如 { a: 123 }
   */
  public sql(sql: string, values: KVObject): query.QueryBuilder;
  /**
   * 执行 SQL 查询
   * @param sql SQL 语句模板
   * @param values 模板参数，如 [ 123 ]
   */
  public sql(sql: string, values: any[]): query.QueryBuilder;

  public sql(sql: string, values?: KVObject | any[]): query.QueryBuilder {
    assert.ok(arguments.length === 1 || arguments.length === 2, `expected 1 or 2 argument for sql() but got ${ arguments.length }`);
    assert.ok(typeof values !== "function", `sql() does not expected a callback function, maybe this is what you want: sql(str).exec(callback)`);
    if (values) {
      return this.query({ format: !utils.isUpdateSQL(sql) }).sql(sql, values);
    }
    return this.query({ format: !utils.isUpdateSQL(sql) }).sql(sql);
  }

  /**
   * 获取指定主键的数据，优先从缓存读取
   * @param query 键值对数据
   */
  public getByPrimary(query: KVObject): Promise<KVObject>;
  /**
   * 获取指定主键的数据，优先从缓存读取
   * @param query 查询条件
   * @param callback 回调函数
   */
  public getByPrimary(query: KVObject, callback: Callback<KVObject>): void;

  public getByPrimary(query: KVObject, callback?: Callback<KVObject>): Promise<KVObject> | void {
    const cb = utils.wrapCallback(callback);
    query = this.keepPrimaryFields(query);
    const key = this.getPrimaryCacheKey(query);
    // 先尝试从缓存中获取
    this.cache.getItem(key, (err, str) => {
      if (err) {
        return cb(err);
      }
      if (str) {
        return cb(err, this.schema.unserialize(str));
      }
      // 从数据库查询
      this.findOne().where(query).exec((err2, ret) => {
        if (err2) {
          return cb(err2);
        }
        // 更新缓存
        this.updateCacheByDataRow(ret).then(() => cb(null, ret)).catch(cb);
      });
    });
    return cb.promise;
  }

  /**
   * 更新指定主键的数据，并删除缓存
   * @param query 查询条件
   * @param update 更新数据
   */
  public updateByPrimary(query: KVObject, update: KVObject): Promise<KVObject>;
  /**
   * 更新指定主键的数据，并删除缓存
   * @param query 查询条件
   * @param update 更新数据
   * @param callback 回调函数
   */
  public updateByPrimary(query: KVObject, update: KVObject, callback: Callback<KVObject>): Promise<KVObject> | void;

  public updateByPrimary(query: KVObject, update: KVObject, callback?: Callback<KVObject>): Promise<KVObject> | void {
    const cb = utils.wrapCallback(callback);
    query = this.keepPrimaryFields(query);
    // 先查询出旧的数据
    this.findOne().where(query).exec((err, data) => {
      if (err) {
        return cb(err);
      }
      if (!data) {
        // 如果数据不存在则直接返回
        return cb(null);
      }
      this.updateOne(update).where(query).exec((err2) => {
        if (err2) {
          return cb(err2);
        }
        // 删除缓存
        this.removeCacheByDataRow(data).then(() => cb(null, data)).catch(cb);
      });
      return cb.promise;
    });
    return cb.promise;
  }

  /**
   * 删除主键的数据，并删除缓存
   * @param query 查询条件
   */
  public deleteByPrimary(query: KVObject): Promise<KVObject>;
  /**
   * 删除主键的数据，并删除缓存
   * @param query 查询条件
   * @param callback 回调函数
   */
  public deleteByPrimary(query: KVObject, callback: Callback<KVObject>): Promise<KVObject> | void;

  public deleteByPrimary(query: KVObject, callback?: Callback<KVObject>): Promise<KVObject> | void {
    const cb = utils.wrapCallback(callback);
    query = this.keepPrimaryFields(query);
    this.findOne().where(query).exec((err, data) => {
      if (err) {
        return cb(err);
      }
      if (!data) {
        // 如果数据不存在则直接返回
        return cb(null);
      }
      this.deleteOne().where(query).exec((err2, ret) => {
        if (err2) {
          return cb(err2);
        }
        // 删除缓存
        this.removeCacheByDataRow(data).then(() => cb(null, data)).catch(cb);
      });
    });
    return cb.promise;
  }

  /**
   * 获取指定唯一键的数据，优先从缓存读取
   * @param query 键值对数据
   */
  public getByUnique(query: KVObject): Promise<KVObject>;
  /**
   * 获取指定唯一键的数据，优先从缓存读取
   * @param query 查询条件
   * @param callback 回调函数
   */
  public getByUnique(query: KVObject, callback: Callback<KVObject>): void;

  public getByUnique(query: KVObject, callback?: Callback<KVObject>): Promise<KVObject> | void {
    const cb = utils.wrapCallback(callback);
    query = this.keepUniqueFields(query);
    const key = this.getUniqueCacheKeys(query)[0] || "";
    // 先尝试从缓存中获取
    this.cache.getPointerItem(key, (err, str) => {
      if (err) {
        return cb(err);
      }
      if (str) {
        return cb(err, this.schema.unserialize(str));
      }
      // 从数据库查询
      this.findOne().where(query).exec((err2, ret) => {
        if (err2) {
          return cb(err2);
        }
        // 更新缓存
        this.updateCacheByDataRow(ret).then(() => cb(null, ret)).catch(cb);
      });
    });
    return cb.promise;
  }

  /**
   * 更新指定唯一键的数据，并删除缓存
   * @param query 查询条件
   * @param update 更新数据
   */
  public updateByUnique(query: KVObject, update: KVObject): Promise<KVObject>;
  /**
   * 更新指定唯一键的数据，并删除缓存
   * @param query 查询条件
   * @param update 更新数据
   * @param callback 回调函数
   */
  public updateByUnique(query: KVObject, update: KVObject, callback: Callback<KVObject>): Promise<KVObject> | void;

  public updateByUnique(query: KVObject, update: KVObject, callback?: Callback<KVObject>): Promise<KVObject> | void {
    const cb = utils.wrapCallback(callback);
    query = this.keepUniqueFields(query);
    // 先查询出旧的数据
    this.findOne().where(query).exec((err, data) => {
      if (err) {
        return cb(err);
      }
      if (!data) {
        // 如果数据不存在则直接返回
        return cb(null);
      }
      this.updateOne(update).where(query).exec((err2) => {
        if (err2) {
          return cb(err2);
        }
        // 删除缓存
        this.removeCacheByDataRow(data).then(() => cb(null, data)).catch(cb);
      });
      return cb.promise;
    });
    return cb.promise;
  }

  /**
   * 删除唯一键的数据，并删除缓存
   * @param query 查询条件
   */
  public deleteByUnique(query: KVObject): Promise<KVObject>;
  /**
   * 删除唯一键的数据，并删除缓存
   * @param query 查询条件
   * @param callback 回调函数
   */
  public deleteByUnique(query: KVObject, callback: Callback<KVObject>): Promise<KVObject> | void;

  public deleteByUnique(query: KVObject, callback?: Callback<KVObject>): Promise<KVObject> | void {
    const cb = utils.wrapCallback(callback);
    query = this.keepUniqueFields(query);
    this.findOne().where(query).exec((err, data) => {
      if (err) {
        return cb(err);
      }
      if (!data) {
        // 如果数据不存在则直接返回
        return cb(null);
      }
      this.deleteOne().where(query).exec((err2, ret) => {
        if (err2) {
          return cb(err2);
        }
        // 删除缓存
        this.removeCacheByDataRow(data).then(() => cb(null, data)).catch(cb);
      });
    });
    return cb.promise;
  }

  /**
   * 删除符合指定查询条件的所有缓存
   * @param query 可以为键值对数据或者 SQL 查询语句
   */
  public removeAllCache(query: KVObject | string): Promise<KVObject[]>;
  /**
   * 删除符合指定查询条件的所有缓存
   * @param query 可以为键值对数据或者 SQL 查询语句
   * @param callback 回调函数
   */
  public removeAllCache(query: KVObject | string, callback: Callback<KVObject[]>): void;

  public removeAllCache(query: KVObject | string, callback?: Callback<KVObject[]>): Promise<KVObject[]> | void {
    const cb = utils.wrapCallback(callback);
    if (this.importantFields.length > 0) {
      // 查询出旧的数据
      const q = this.find().fields(...this.importantFields);
      if (typeof query === "string") {
        q.where(query);
      } else {
        q.where(query);
      }
      q.exec((err, list) => {
        if (err) {
          return cb(err);
        }
        // 生成所有缓存的 Key
        let keys: string[] = [];
        for (const item of list) {
          const { allKeys } = this.getCacheKeysByDataRow(item);
          keys = keys.concat(allKeys);
        }
        // 删除缓存
        this.cache.removeList(keys, (err2) => cb(err2, list));
      });
    } else {
      process.nextTick(() => cb(null, []));
    }
    return cb.promise;
  }

  /**
   * 更新缓存，包括 primaryKey 和 uniqueKeys
   */
  private async updateCacheByDataRow(data: KVObject): Promise<string[]> {
    if (data) {
      const { primaryKey, uniqueKeys, allKeys } = this.getCacheKeysByDataRow(data);
      await this.cache.removeList(allKeys.slice());
      const save: cache.CacheDataItem[] = [];
      save.push({ key: primaryKey, data: this.schema.serialize(data) });
      for (const key of uniqueKeys) {
        save.push({ key, data: primaryKey });
      }
      await this.cache.saveList(save);
      return allKeys;
    }
    return [];
  }

  /**
   * 删除缓存，包括 primaryKey 和 uniqueKeys
   */
  private async removeCacheByDataRow(data: KVObject): Promise<string[]> {
    if (data) {
      const { allKeys } = this.getCacheKeysByDataRow(data);
      await this.cache.removeList(allKeys.slice());
      return allKeys;
    }
    return [];
  }

  /**
   * 根据数据行获取其相关的缓存 Key
   */
  private getCacheKeysByDataRow(data: KVObject): {
    primaryKey: string;
    uniqueKeys: string[];
    allKeys: string[];
  } {
    const primaryKey = this.getPrimaryCacheKey(data);
    const uniqueKeys = this.getUniqueCacheKeys(data);
    const allKeys = [ primaryKey ].concat(uniqueKeys);
    return { primaryKey, uniqueKeys, allKeys };
  }

}
