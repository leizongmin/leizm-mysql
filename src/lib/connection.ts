/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import assert = require("assert");
import events = require("events");
import mysql = require("mysql");
import utils = require("./utils");
import { Callback } from "./define";

export interface QueryError extends mysql.IError {
  /**
   * 当前执行的 SQL 语句
   */
  sql?: string;
}

export interface WrappedConnection {
  /**
   * 执行查询
   * @param sql SQL 语句
   * @param values 模板变量
   * @param callback 回调函数
   */
  query(
    sql: string,
    values?: any[],
    callback?: (err: Error, ret: any) => void
  ): Promise<any>;
  /**
   * 值转义
   */
  escape(value: any): string;
  /**
   * 标志符转义
   */
  escapeId(value: string): string;
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
          return (...args: any[]) => {
            const cb = args[args.length - 1];
            if (typeof cb === "function") {
              return target[name](...args);
            }
            return target[name](...args);
          };
        default:
          return target[name];
      }
    }
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

  /**
   * 是否自动删除 Emoji 字符，默认 true
   */
  stripEmoji?: boolean;
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
    assert.ok(
      Array.isArray(options.connections),
      `connections must be an array`
    );
    assert.ok(
      options.connections.length >= 1,
      `connections must includes at least one item`
    );

    this._options = Object.assign<any, ConnectionOptions>({}, options);
    if (!("stripEmoji" in this._options)) {
      this._options.stripEmoji = true;
    }

    this._poolCluster = mysql.createPoolCluster();
    this._poolCluster.add("MASTER", options.connections[0]);
    options.connections.slice(1).forEach((config, index) => {
      this._poolCluster.add(`SLAVE${index}`, config);
    });
    this._poolMaster = this._poolCluster.of("MASTER");
    this._poolSlave = this._poolCluster.of("SLAVE*");

    this._poolCluster.on("error", err => this.emit("error", err));
    this._poolCluster.on("connection", connection =>
      this.emit("connection", connection)
    );
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
  public close(callback: Callback<void>): void;

  public close(callback?: Callback<void>): Promise<void> | void {
    const cb = utils.wrapCallback(callback);
    this._poolCluster.end();
    process.nextTick(cb);
    return cb.promise;
  }

  /**
   * 获取一个原始连接
   */
  public getConnection(): Promise<WrappedConnection>;
  /**
   * 获取一个原始连接
   * @param callback 回调函数
   */
  public getConnection(callback: Callback<WrappedConnection>): void;

  public getConnection(
    callback?: Callback<WrappedConnection>
  ): Promise<WrappedConnection> | void {
    const cb = utils.wrapCallback(callback);
    return this._getConnection(this._poolCluster, cb);
  }

  /**
   * 获取一个 MASTER 连接
   */
  public getMasterConnection(): Promise<WrappedConnection>;
  /**
   * 获取一个 MASTER 连接
   * @param callback 回调函数
   */
  public getMasterConnection(callback: Callback<WrappedConnection>): void;

  public getMasterConnection(
    callback?: Callback<WrappedConnection>
  ): Promise<WrappedConnection> | void {
    const cb = utils.wrapCallback(callback);
    return this._getConnection(this._poolCluster, cb);
  }

  /**
   * 获取一个 SLAVE 连接
   */
  public getSlaveConnection(): Promise<WrappedConnection>;
  /**
   * 获取一个 SLAVE 连接
   * @param callback 回调函数
   */
  public getSlaveConnection(callback: Callback<WrappedConnection>): void;

  public getSlaveConnection(
    callback?: Callback<WrappedConnection>
  ): Promise<WrappedConnection> | void {
    const cb = utils.wrapCallback(callback);
    return this._getConnection(this._poolCluster, cb);
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
  public query(sql: string, callback: Callback<any>): void;

  public query(sql: string, callback?: Callback<any>): Promise<any> | void {
    const cb = utils.wrapCallback(callback);
    if (utils.isUpdateSQL(sql)) {
      return this.queryMaster(sql, cb);
    }
    return this._query(this._poolCluster, sql, cb);
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
  public queryMaster(sql: string, callback: Callback<any>): void;

  public queryMaster(
    sql: string,
    callback?: Callback<any>
  ): Promise<any> | void {
    const cb = utils.wrapCallback(callback);
    return this._query(this._poolMaster, sql, cb);
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
  public querySlave(sql: string, callback: Callback<any>): void;

  public querySlave(
    sql: string,
    callback?: Callback<any>
  ): Promise<any> | void {
    const cb = utils.wrapCallback(callback);
    return this._query(this._poolSlave, sql, cb);
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
  public format(sql: string, values: Record<string, any>): string;

  public format(sql: string, values: any[] | Record<string, any>): string {
    if (Array.isArray(values)) {
      return utils.sqlFormat(sql, values);
    }
    return utils.sqlFormatObject(sql, values);
  }

  /**
   * 获取一个原始连接（增加 Promise 支持）
   * @param pool 连接池
   */
  private _getConnection(
    pool: mysql.IPool | mysql.IPoolCluster
  ): Promise<WrappedConnection>;
  /**
   * 获取一个原始连接（增加 Promise 支持）
   * @param pool 连接池
   * @param callback 回调函数
   */
  private _getConnection(
    pool: mysql.IPool | mysql.IPoolCluster,
    callback: Callback<WrappedConnection>
  ): void;

  private _getConnection(
    pool: mysql.IPool | mysql.IPoolCluster,
    callback?: Callback<WrappedConnection>
  ): Promise<WrappedConnection> | void {
    const cb = utils.wrapCallback<WrappedConnection>(callback);
    pool.getConnection((err, connection) => {
      if (err) {
        return cb(err);
      }
      cb(null, wrapConnection(connection));
    });
    return cb.promise;
  }

  /**
   * 执行 SQL 查询
   * @param pool 连接池
   * @param sql  SQL 查询语句
   */
  private _query(
    pool: mysql.IPool | mysql.IPoolCluster,
    sql: string
  ): Promise<any>;
  /**
   * 执行 SQL 查询
   * @param pool 连接池
   * @param sql  SQL 查询语句
   * @param callback 回调函数
   */
  private _query(
    pool: mysql.IPool | mysql.IPoolCluster,
    sql: string,
    callback?: Callback<any>
  ): void;

  private _query(
    pool: mysql.IPool | mysql.IPoolCluster,
    sql: string,
    callback?: Callback<any>
  ): Promise<any> | void {
    const cb = utils.wrapCallback<any>(callback);
    utils.connectionDebug("query sql: %s", sql);
    pool.getConnection((err, connection) => {
      if (err) {
        return cb(err);
      }
      const cc = connection.config || {};
      this.emit("query", { sql, connection, name: `${cc.host}:${cc.port}` });
      if (this._options.stripEmoji) {
        sql = utils.stripEmoji(sql);
      }
      connection.query(sql, (err2: QueryError | null, ret) => {
        connection.release();
        // 如果查询出错，在 Error 对象中附加当前正在查询的 SQL 语句
        if (err2) {
          err2.sql = sql;
        }
        cb(err2, ret);
      });
    });
    return cb.promise;
  }
}
