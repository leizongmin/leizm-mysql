/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import assert = require("assert");
import events = require("events");
import mysql = require("mysql");
import utils = require("./utils");
import coroutine = require("lei-coroutine");

export interface WrappedConnection {
  /**
   * 执行查询
   * @param sql SQL 语句
   * @param values 模板变量
   * @param callback 回调函数
   */
  query(sql: string, values?: any[], callback?: (err: Error, ret: any) => void): Promise<any>;
  /**
   * 开始事务
   * @param callback 回调函数
   */
  beginTransaction(callback?: (err: Error) => void): Promise<any>;
  /**
   * 提交事务
   * @param callback 回调函数
   */
  commit(callback?: (err: Error) => void): Promise<any>;
  /**
   * 回滚事务
   * @param callback 回调函数
   */
  rollback(callback?: () => void): Promise<any>;
  /**
   * 暂停
   */
  pause(): void;
  /**
   * 释放
   */
  release(): void;
  /**
   * 继续
   */
  resume(): void;
}

/**
 * 原始 connection 增加 Promise 支持
 */
function wrapConnection(connection: any): WrappedConnection {
  return new Proxy(connection, {
    get(target, name) {
      switch (name) {
      case "query":
      case "beginTransaction":
      case "commit":
      case "rollback":
        return function (...args: any[]) {
          const cb = args[args.length - 1];
          if (typeof cb === "function") {
            return target[name](...args);
          }
          return coroutine.cb(target, name, ...args);
        };
      default:
        return target[name];
      }
    },
  });
}

export interface ConnectionOptions {
  /**
   * MySQL 数据库连接数组，第一个为 master
   * 包含 { host, port, user, password, database, connectionLimit }
   * 参考 https://www.npmjs.com/package/mysql#connection-options
   * 和   https://www.npmjs.com/package/mysql#pool-options
   */
  connections: mysql.IPoolConfig[];
}

export class Connection extends events.EventEmitter {

  private _options: ConnectionOptions;
  private _poolCluster: mysql.IPoolCluster;
  private _poolMaster: mysql.IPool;
  private _poolSlave: mysql.IPool;

  /**
   * 创建 Connection
   */
  constructor(options: ConnectionOptions) {
    super();

    assert.ok(options, `missing options`);
    assert.ok(Array.isArray(options.connections), `connections must be an array`);
    assert.ok(options.connections.length >= 1, `connections must includes at least one item`);

    this._options = Object.assign<any, ConnectionOptions>({}, options);

    this._poolCluster = mysql.createPoolCluster();
    this._poolCluster.add("MASTER", options.connections[0]);
    options.connections.slice(1).forEach((config, index) => {
      this._poolCluster.add(`SLAVE${ index }`, config);
    });
    this._poolMaster = this._poolCluster.of("MASTER");
    this._poolSlave = this._poolCluster.of("SLAVE*");

    this._poolCluster.on("error", err => this.emit("error", err));
    this._poolCluster.on("connection", connection => this.emit("connection", connection));
    this._poolCluster.on("enqueue", () => this.emit("enqueue"));
  }

  /**
   * 关闭连接
   */
  public close(): Promise<void>;
  /**
   * 关闭连接
   * @param callback 回调函数
   */
  public close(callback: utils.Callback<void>): void;

  public close(callback?: utils.Callback<void>): Promise<void> | void {
    callback = utils.wrapCallback<void>(callback);
    this._poolCluster.end();
    process.nextTick(callback);
    return callback.promise;
  }

  /**
   * 获取一个原始连接
   */
  public getConnection(): Promise<WrappedConnection>;
  /**
   * 获取一个原始连接
   * @param callback 回调函数
   */
  public getConnection(callback: utils.Callback<WrappedConnection>): void;

  public getConnection(callback?: utils.Callback<WrappedConnection>): Promise<WrappedConnection> | void {
    callback = utils.wrapCallback<WrappedConnection>(callback);
    return this._getConnection(this._poolCluster, callback);
  }

  /**
   * 获取一个 MASTER 连接
   */
  public getMasterConnection(): Promise<WrappedConnection>;
  /**
   * 获取一个 MASTER 连接
   * @param callback 回调函数
   */
  public getMasterConnection(callback: utils.Callback<WrappedConnection>): void;

  public getMasterConnection(callback?: utils.Callback<WrappedConnection>): Promise<WrappedConnection> | void {
    callback = utils.wrapCallback<WrappedConnection>(callback);
    return this._getConnection(this._poolCluster, callback);
  }

  /**
   * 获取一个 SLAVE 连接
   */
  public getSlaveConnection(): Promise<WrappedConnection>;
  /**
   * 获取一个 SLAVE 连接
   * @param callback 回调函数
   */
  public getSlaveConnection(callback: utils.Callback<WrappedConnection>): void;

  public getSlaveConnection(callback?: utils.Callback<WrappedConnection>): Promise<WrappedConnection> | void {
    callback = utils.wrapCallback<WrappedConnection>(callback);
    return this._getConnection(this._poolCluster, callback);
  }

  /**
   * 智能查询，更新操作会在 MASTER 执行，其他在任意服务器查询
   * @param sql 要执行的 SQL 查询语句
   */
  public query(sql: string): Promise<any>;
  /**
   * 智能查询，更新操作会在 MASTER 执行，其他在任意服务器查询
   * @param sql 要执行的 SQL 查询语句
   * @param callback 回调函数
   */
  public query(sql: string, callback: utils.Callback<any>): void;

  public query(sql: string, callback?: utils.Callback<any>): Promise<any> | void {
    callback = utils.wrapCallback(callback);
    if (utils.isUpdateSQL(sql)) {
      return this.queryMaster(sql, callback);
    }
    return this._query(this._poolCluster, sql, callback);
  }

  /**
   * 在 MASTER 上执行查询
   * @param sql 要执行的 SQL 查询语句
   */
  public queryMaster(sql: string): Promise<any>;
  /**
   * 在 MASTER 上执行查询
   * @param sql 要执行的 SQL 查询语句
   * @param callback 回调函数
   */
  public queryMaster(sql: string, callback: utils.Callback<any>): void;

  public queryMaster(sql: string, callback?: utils.Callback<any>): Promise<any> | void {
    callback = utils.wrapCallback(callback);
    return this._query(this._poolMaster, sql, callback);
  }

  /**
   * 在 SLAVE 上执行查询
   * @param sql 要执行的 SQL 查询语句
   */
  public querySlave(sql: string): Promise<any>;
  /**
   * 在 SLAVE 上执行查询
   * @param sql 要执行的 SQL 查询语句
   * @param callback 回调函数
   */
  public querySlave(sql: string, callback: utils.Callback<any>): void;

  public querySlave(sql: string, callback?: utils.Callback<any>): Promise<any> | void {
    callback = utils.wrapCallback(callback);
    return this._query(this._poolSlave, sql, callback);
  }

  /**
   * 值转义
   */
  public escape(value: any): string {
    return utils.sqlEscape(value);
  }

  /**
   * 标志符转义
   */
  public escapeId(value: string): string {
    return utils.sqlEscapeId(value);
  }

  /**
   * 以数组参数形式格式化查询
   */
  public format(sql: string, values: any[]): string;
  /**
   * 以键值对参数形式格式化查询
   */
  public format(sql: string, values: utils.KVObject): string;

  public format(sql: string, values: any[] | utils.KVObject): string {
    if (Array.isArray(values)) {
      return utils.sqlFormat(sql, values);
    }
    return utils.sqlFormatObject(sql, values);
  }

  /**
   * 获取一个原始连接（增加 Promise 支持）
   * @param pool 连接池
   */
  private _getConnection(pool: mysql.IPool | mysql.IPoolCluster): Promise<WrappedConnection>;
  /**
   * 获取一个原始连接（增加 Promise 支持）
   * @param pool 连接池
   * @param callback 回调函数
   */
  private _getConnection(pool: mysql.IPool | mysql.IPoolCluster, callback: utils.Callback<WrappedConnection>): void;

  private _getConnection(pool: mysql.IPool | mysql.IPoolCluster, callback?: utils.Callback<WrappedConnection>): Promise<WrappedConnection> | void {
    callback = utils.wrapCallback<WrappedConnection>(callback);
    pool.getConnection((err, connection) => {
      if (err) {
        return callback(err);
      }
      callback(null, wrapConnection(connection));
    });
    return callback.promise;
  }

  /**
   * 执行 SQL 查询
   * @param pool 连接池
   * @param sql  SQL 查询语句
   */
  private _query(pool: mysql.IPool | mysql.IPoolCluster, sql: string): Promise<any>;
  /**
   * 执行 SQL 查询
   * @param pool 连接池
   * @param sql  SQL 查询语句
   * @param callback 回调函数
   */
  private _query(pool: mysql.IPool | mysql.IPoolCluster, sql: string, callback?: utils.Callback<any>): void;

  private _query(pool: mysql.IPool | mysql.IPoolCluster, sql: string, callback?: utils.Callback<any>): Promise<any> | void {
    callback = utils.wrapCallback<any>(callback);
    utils.connectionDebug("query sql: %s", sql);
    pool.getConnection((err, connection) => {
      if (err) {
        return callback(err);
      }
      connection.query(sql, (err2, ret) => {
        connection.release();
        callback(err2, ret);
      });
    });
    return callback.promise;
  }

}
