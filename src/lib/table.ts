/**
 * @leizm/mysql
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import * as assert from "assert";
import * as utils from "./utils";
import * as connection from "./connection";
import * as cache from "./cache";
import * as schema from "./schema";
import * as query from "./query";
import { Callback, DataRow } from "./define";

export type FieldName = string | string[];

export interface TableBaseOptions extends schema.SchemaOptions {
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

export interface TableOptions extends TableBaseOptions {
  /**
   * Connection 实例
   */
  connection: connection.IConnectionBase;
  /**
   * Cache 实例
   */
  cache: cache.Cache;
}

export interface TableQueryOptions {
  /**
   * 是否只使用 master 连接执行查询
   */
  master?: boolean;
  /**
   * 是否自动格式化查询结果
   */
  format?: boolean;
  /**
   * 回调函数
   */
  callback?: (err: Error | null, ret: any, callback: Callback<any>) => void;
}

export class Table<R = DataRow> {
  /** Connection 实例 */
  public readonly connection: connection.IConnectionBase;
  /** Cache 实例 */
  public readonly cache: cache.Cache;
  /** 表名 */
  public readonly tableName: string;
  /** 主键 */
  public readonly primaryKey: string[] = [];
  /** 主键是否自增 */
  public readonly primaryKeyAutoIncrement: boolean;
  /** 唯一键列表 */
  public readonly uniqueKeyList: string[][] = [];
  /** 主键和唯一键列表 */
  public readonly importantFields: string[];
  /** Schema 实例 */
  public readonly schema: schema.Schema;

  /**
   * 创建 Table
   */
  constructor(public readonly options: TableOptions) {
    assert.ok(options, `missing options`);

    assert.ok(utils.isConnectionBaseInstance(options.connection), `connection must be an ConnectionBase instance`);
    this.connection = options.connection;

    assert.ok(utils.isCacheInstance(options.cache), `cache must be an Cache instance`);
    this.cache = options.cache;

    assert.ok(options.table, `must provide table name`);
    assert.ok(typeof options.table === "string", `table name must be a string`);
    this.tableName = options.table;

    const importantFields = new Set<string>();

    // 主键
    if (options.primary) {
      assert.ok(
        typeof options.primary === "string" || Array.isArray(options.primary),
        `primary must be a string or array`,
      );
      if (Array.isArray(options.primary)) {
        options.primary.forEach(name => {
          assert.ok(typeof name === "string", `every item of primary must be a string`);
        });
        // 包装 key 是按顺序排列的
        this.primaryKey = options.primary.slice().sort();
      } else {
        this.primaryKey = [options.primary];
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
        assert.ok(typeof item === "string" || Array.isArray(item));
        if (Array.isArray(item)) {
          return item.sort();
        } else {
          return [item];
        }
      });
      this.uniqueKeyList.forEach(fields => fields.forEach(f => importantFields.add(f)));
    }

    // 主键和唯一键列表
    this.importantFields = Array.from(importantFields).sort();

    this.schema = new schema.Schema(options);
  }

  /**
   * 返回绑定指定连接的新实例
   * @param connection
   */
  public bindConnection(c: connection.WrappedConnection) {
    return new Table<R>({ ...this.options, connection: connection.toConnectionBase(c) });
  }

  /**
   * 从一行数据中获取主键缓存名称
   * @param data 键值对数据
   * @param strict 是否严格检查每个键的数据都存在，如果为 true 且键不存在时抛出异常，否则返回 undefined
   */
  public getPrimaryCacheKey(data: DataRow, strict?: boolean): string {
    assert.ok(this.primaryKey, `table "${this.tableName}" does not have primary key`);
    let isEveryKeyExists = true;
    const key = this.primaryKey
      .map(name => {
        isEveryKeyExists = isEveryKeyExists && name in data;
        if (strict) {
          assert.ok(isEveryKeyExists, `missing primary key "${name}" in this data row`);
        }
        return `${name}:${data[name]}`;
      })
      .join(":");
    return isEveryKeyExists ? `${this.tableName}:r:${key}` : "";
  }

  /**
   * 从一行数据中获取唯一键缓存名称列表
   * @param data 键值对数据
   */
  public getUniqueCacheKeys(data: DataRow): string[] {
    const list: string[] = [];
    const prefix = `${this.tableName}:u:`;
    if (Array.isArray(this.uniqueKeyList)) {
      this.uniqueKeyList.forEach(fields => {
        if (utils.everyFieldExists(data, fields)) {
          list.push(prefix + fields.map(f => `${f}:${data[f]}`).join(":"));
        }
      });
    }
    return list;
  }

  /**
   * 从一行数据中保留主键的数据
   * @param data 键值对数据
   */
  public keepPrimaryFields(data: DataRow): Partial<R> {
    assert.ok(this.primaryKey, `table "${this.tableName}" does not have primary key`);
    const ret: DataRow = {};
    for (const name of this.primaryKey) {
      assert.ok(name in data, `missing primary key "${name}" in this data row`);
      ret[name] = data[name];
    }
    return ret as any;
  }

  /**
   * 从一行数据中保留唯一键的数据，如果有多组唯一键则仅返回第一个匹配的唯一键
   * @param data 键值对数据
   */
  public keepUniqueFields(data: DataRow): Partial<R> {
    assert.ok(this.uniqueKeyList, `table "${this.tableName}" does not have unique key`);
    for (const fields of this.uniqueKeyList) {
      if (utils.everyFieldExists(data, fields)) {
        const ret: DataRow = {};
        for (const f of fields) {
          ret[f] = data[f];
        }
        return ret as any;
      }
    }
    throw new Error(
      `missing unique key in this data row, must includes one of ${this.uniqueKeyList
        .map(keys => keys.join(","))
        .join(" | ")}`,
    );
  }

  /**
   * 创建 Query
   */
  public query(options: TableQueryOptions = {}): query.QueryBuilder {
    return new query.QueryBuilder({
      table: this.tableName,
      schema: this.schema,
      exec: (sql, callback) => {
        const cb = (err: Error | null, ret?: any) => {
          if (options.callback) {
            return options.callback(err, ret, callback);
          }
          callback(err, ret);
        };
        const method = options.master ? "queryMaster" : "query";
        this.connection[method](sql)
          .then(ret => {
            // 格式化输出
            if (ret && options.format) {
              if (Array.isArray(ret)) {
                ret = this.schema.formatOutputList(ret);
              } else {
                ret = this.schema.formatOutput(ret);
              }
            }
            cb(null, ret);
          })
          .catch(err => cb(err));
      },
    });
  }

  /**
   * 查询数据
   */
  public find(options: Pick<TableQueryOptions, "master"> = {}): query.QueryBuilder {
    return this.query({ ...options, format: true }).select("*");
  }

  /**
   * 查询一行数据
   */
  public findOne(options: Pick<TableQueryOptions, "master"> = {}): query.QueryBuilder {
    return this.query({
      ...options,
      format: true,
      callback(err, ret, callback) {
        if (err) {
          return callback(err);
        }
        callback(null, ret[0]);
      },
    })
      .select("*")
      .limit(1);
  }

  /**
   * 查询数量
   */
  public count(options: Pick<TableQueryOptions, "master"> = {}): query.QueryBuilder {
    return this.query({
      ...options,
      format: false,
      callback(err, ret, callback) {
        if (err) {
          return callback(err);
        }
        callback(null, ret[0].c);
      },
    })
      .count("c")
      .limit(1);
  }

  /**
   * 更新数据
   * @param update 键值对数据
   */
  public update(update: DataRow): query.QueryBuilder;
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
  public update(update: string, values: DataRow): query.QueryBuilder;
  /**
   * 更新数据
   * @param update SQL 模板语句
   * @param values 模板参数，如 [ 123 ]
   */
  public update(update: string, values: any[]): query.QueryBuilder;

  public update(update: DataRow | string, values?: DataRow | any[]): query.QueryBuilder {
    assert.ok(
      arguments.length === 1 || arguments.length === 2,
      `expected 1 or 2 argument for update() but got ${arguments.length}`,
    );
    // 格式化输入
    if (typeof update === "string") {
      if (values) {
        return this.query({ format: false }).update(update, values);
      }
      return this.query({ format: false }).update(update);
    }
    return this.query({ format: false }).update(update);
  }

  /**
   * 更新一行数据
   * @param update 键值对数据
   */
  public updateOne(update: DataRow): query.QueryBuilder;
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
  public updateOne(update: string, values: DataRow): query.QueryBuilder;
  /**
   * 更新一行数据
   * @param update SQL 模板语句
   * @param values 模板参数，如 [ 123 ]
   */
  public updateOne(update: string, values: any[]): query.QueryBuilder;

  public updateOne(update: DataRow | string, values?: DataRow | any[]): query.QueryBuilder {
    assert.ok(
      arguments.length === 1 || arguments.length === 2,
      `expected 1 or 2 argument for updateOne() but got ${arguments.length}`,
    );
    // 格式化输入
    if (typeof update === "string") {
      if (values) {
        return this.query({ format: false })
          .update(update, values)
          .limit(1);
      }
      return this.query({ format: false })
        .update(update)
        .limit(1);
    }
    return this.query({ format: false }).update(update);
  }

  /**
   * 删除数据
   */
  public delete(): query.QueryBuilder {
    return this.query({ format: false }).delete();
  }

  /**
   * 删除一行数据
   */
  public deleteOne(): query.QueryBuilder {
    return this.query({ format: false })
      .delete()
      .limit(1);
  }

  /**
   * 插入数据
   * @param data 键值对数据
   */
  public async insert(data: DataRow, refreshNewData?: boolean): Promise<R[]>;
  /**
   * 插入数据
   * @param data 键值对数据数组
   */
  public async insert(data: Array<DataRow>, refreshNewData?: boolean): Promise<R[]>;

  public async insert(data: DataRow | Array<DataRow>, refreshNewData: boolean = true): Promise<R[]> {
    assert.equal(arguments.length, 1, `expected 1  argument for insert() but got ${arguments.length}`);
    const list: Array<DataRow> = Array.isArray(data) ? data : [data];
    // 检查是否包含主键（仅当主键不是自增时）
    if (!this.primaryKeyAutoIncrement) {
      for (const item of list) {
        for (const key of this.primaryKey) {
          if (typeof item[key] === "undefined") {
            throw new Error(`missing primary key "${key}"`);
          }
        }
      }
    }

    const retList: Array<DataRow> = [];
    for (const item of list) {
      const ret = await this.query({ format: false })
        .insert(item)
        .exec();
      // 如果主键是自增时，从insertId获取自增主键
      if (this.primaryKeyAutoIncrement) {
        item[this.primaryKey[0]] = ret.insertId;
      }
      if (refreshNewData) {
        // 查询最新数据，顺便刷新缓存
        const newData = await this.getByPrimary(item, { master: true });
        retList.push(newData);
      } else {
        retList.push({ ...item });
      }
    }
    return retList as any;
  }

  /**
   * 增加指定字段的值
   * @param data 键值对数据，如：{ count: 1 }
   */
  public incr(data: DataRow): query.QueryBuilder {
    assert.equal(arguments.length, 1, `expected 1  argument for incr() but got ${arguments.length}`);
    const q = this.query({ format: false }).update();
    for (const name in data) {
      q.set("?? = ?? + (?)", [name, name, data[name]]);
    }
    return q;
  }

  /**
   * 执行 SQL 查询
   * @param sql SQL 语句
   */
  public sql(sql: string, options?: TableQueryOptions): query.QueryBuilder;
  /**
   * 执行 SQL 查询
   * @param sql SQL 语句模板
   * @param values 模板参数，如 { a: 123 }
   */
  public sql(sql: string, values: DataRow, options?: TableQueryOptions): query.QueryBuilder;
  /**
   * 执行 SQL 查询
   * @param sql SQL 语句模板
   * @param values 模板参数，如 [ 123 ]
   */
  public sql(sql: string, values: any[], options?: TableQueryOptions): query.QueryBuilder;

  public sql(sql: string, values?: DataRow | any[], options?: TableQueryOptions): query.QueryBuilder {
    assert.ok(
      arguments.length === 1 || arguments.length === 2,
      `expected 1 or 2 argument for sql() but got ${arguments.length}`,
    );
    options = options || {};
    if (values) {
      return this.query({ ...options, format: !utils.isUpdateSQL(sql) }).sql(sql, values);
    }
    return this.query({ ...options, format: !utils.isUpdateSQL(sql) }).sql(sql);
  }

  /**
   * 获取指定主键的数据，优先从缓存读取
   * @param query 键值对数据
   */
  public async getByPrimary(query: DataRow, options: Pick<TableQueryOptions, "master"> = {}): Promise<R> {
    query = this.keepPrimaryFields(query);
    const key = this.getPrimaryCacheKey(query);
    // 先尝试从缓存中获取
    const str = await this.cache.getItem(key);
    if (str) {
      return this.schema.unserialize(str) as any;
    }
    // 从数据库查询
    const ret = await this.findOne(options)
      .where(query)
      .exec();
    // 更新缓存
    await this.updateCacheByDataRow(ret);
    return ret;
  }

  /**
   * 更新指定主键的数据，并删除缓存
   * @param query 查询条件
   * @param update 更新数据
   */
  public async updateByPrimary(query: DataRow, update: DataRow): Promise<R | null> {
    query = this.keepPrimaryFields(query);
    // 先查询出旧的数据
    const data = await this.findOne({ master: true })
      .where(query)
      .exec();
    if (!data) {
      // 如果数据不存在则直接返回
      return null;
    }
    await this.updateOne(update)
      .where(query)
      .exec();
    // 删除缓存
    await this.removeCacheByDataRow(data);
    // 设置新缓存
    const newData = await this.findOne({ master: true })
      .where(query)
      .exec();
    if (newData) {
      await this.updateCacheByDataRow(newData);
    }
    return newData;
  }

  /**
   * 删除主键的数据，并删除缓存
   * @param query 查询条件
   */
  public async deleteByPrimary(query: DataRow): Promise<R | null> {
    query = this.keepPrimaryFields(query);
    const data = await this.findOne({ master: true })
      .where(query)
      .exec();
    if (!data) {
      // 如果数据不存在则直接返回
      return null;
    }
    await this.deleteOne()
      .where(query)
      .exec();
    // 删除缓存
    await this.removeCacheByDataRow(data);
    return data;
  }

  /**
   * 获取指定唯一键的数据，优先从缓存读取
   * @param query 键值对数据
   */
  public async getByUnique(query: DataRow, options: Pick<TableQueryOptions, "master"> = {}): Promise<R> {
    query = this.keepUniqueFields(query);
    const key = this.getUniqueCacheKeys(query)[0] || "";
    // 先尝试从缓存中获取
    const str = await this.cache.getPointerItem(key);
    if (str) {
      return this.schema.unserialize(str) as any;
    }
    // 从数据库查询
    const ret = await this.findOne(options)
      .where(query)
      .exec();
    // 更新缓存
    await this.updateCacheByDataRow(ret);
    return ret;
  }

  /**
   * 更新指定唯一键的数据，并删除缓存
   * @param query 查询条件
   * @param update 更新数据
   */
  public async updateByUnique(query: DataRow, update: DataRow): Promise<R | null> {
    query = this.keepUniqueFields(query);
    // 先查询出旧的数据
    const data = await this.findOne({ master: true })
      .where(query)
      .exec();
    if (!data) {
      // 如果数据不存在则直接返回
      return null;
    }
    await this.updateOne(update)
      .where(query)
      .exec();
    // 删除缓存
    await this.removeCacheByDataRow(data);
    // 设置新缓存
    const newData = await this.findOne({ master: true })
      .where(query)
      .exec();
    if (newData) {
      await this.updateCacheByDataRow(newData);
    }
    return newData;
  }

  /**
   * 删除唯一键的数据，并删除缓存
   * @param query 查询条件
   */
  public async deleteByUnique(query: DataRow): Promise<R | null> {
    query = this.keepUniqueFields(query);
    const data = await this.findOne({ master: true })
      .where(query)
      .exec();
    if (!data) {
      // 如果数据不存在则直接返回
      return null;
    }
    await this.deleteOne()
      .where(query)
      .exec();
    // 删除缓存
    await this.removeCacheByDataRow(data);
    return data;
  }

  /**
   * 删除符合指定查询条件的所有缓存
   * @param query 可以为键值对数据或者 SQL 查询语句
   */
  public async removeAllCache(query: DataRow | string): Promise<string[]> {
    if (this.importantFields.length > 0) {
      // 查询出旧的数据
      const q = this.find({ master: true }).fields(...this.importantFields);
      if (typeof query === "string") {
        q.where(query);
      } else {
        q.where(query);
      }
      const list = await q.exec();
      // 生成所有缓存的 Key
      let keys: string[] = [];
      for (const item of list) {
        const { allKeys } = this.getCacheKeysByDataRow(item);
        keys = keys.concat(allKeys);
      }
      // 删除缓存
      await this.cache.removeList(keys);
      return list;
    }
    return [];
  }

  /**
   * 更新缓存，包括 primaryKey 和 uniqueKeys
   */
  public async updateCacheByDataRow(data: DataRow): Promise<string[]> {
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
  public async removeCacheByDataRow(data: DataRow): Promise<string[]> {
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
  public getCacheKeysByDataRow(
    data: DataRow,
  ): {
    primaryKey: string;
    uniqueKeys: string[];
    allKeys: string[];
  } {
    const primaryKey = this.getPrimaryCacheKey(data);
    const uniqueKeys = this.getUniqueCacheKeys(data);
    const allKeys = [primaryKey].concat(uniqueKeys);
    return { primaryKey, uniqueKeys, allKeys };
  }
}
