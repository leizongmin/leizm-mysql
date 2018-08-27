/**
 * @leizm/mysql
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import * as assert from "assert";
import * as events from "events";
import * as mysql from "mysql";
import * as utils from "./utils";

export type MysqlPool = mysql.Pool | mysql.PoolCluster;

export interface QueryError extends mysql.MysqlError {
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
  query(sql: string, values?: any[]): Promise<any>;
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
  beginTransaction(): Promise<any>;
  /**
   * 提交事务
   * @param callback 回调函数
   */
  commit(): Promise<any>;
  /**
   * 回滚事务
   * @param callback 回调函数
   */
  rollback(): Promise<any>;
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
            if (typeof cb === "function") return target[name](...args);
            return new Promise((resolve, reject) => {
              target[name](...args, (err: Error, ret: any) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(ret);
                }
              });
            });
          };
        default:
          return target[name];
      }
    },
  });
}

/**
 * 用于 table 的 connection 接口
 */
export interface ConnectionBase {
  query(sql: string): Promise<any>;
  queryMaster(sql: string): Promise<any>;
}

/**
 * 封装原始 connection
 */
export function toConnectionBase(c: WrappedConnection): ConnectionBase {
  function query(sql: string) {
    return c.query(sql);
  }
  return { query, queryMaster: query };
}

export interface ConnectionOptions {
  /**
   * MySQL 数据库连接数组，第一个为 master
   * 包含 { host, port, user, password, database, connectionLimit }
   * 参考 https://www.npmjs.com/package/mysql#connection-options
   * 和   https://www.npmjs.com/package/mysql#pool-options
   */
  connections: mysql.PoolConfig[];

  /**
   * 是否自动删除 Emoji 字符，默认 true
   */
  stripEmoji?: boolean;
}

export interface QueryEventData {
  /**
   * 请求ID
   */
  id: string;
  /**
   * 要执行的 SQL
   */
  sql: string;
  /**
   * 原始 MySQL 连接
   */
  connection: mysql.PoolConnection;
  /**
   * 连接名称：host:port
   */
  name: string;
  /**
   * 时间戳
   */
  timestamp: number;
}

export interface ResultEventData {
  /**
   * 请求ID
   */
  id: string;
  /**
   * 要执行的 SQL
   */
  sql: string;
  /**
   * 原始 MySQL 连接
   */
  connection: mysql.PoolConnection;
  /**
   * 连接名称：host:port
   */
  name: string;
  /**
   * 查询时间戳
   */
  timestamp: number;
  /**
   * 消耗时间（毫秒）
   */
  spent: number;
  /**
   * 结果
   */
  data: any;
  /**
   * 出错信息
   */
  error: null | Error;
}

export type ConnectionEvent = "error" | "connection" | "enqueue" | "query" | "result";

export class Connection extends events.EventEmitter {
  protected readonly options: ConnectionOptions;
  protected readonly poolCluster: mysql.PoolCluster;

  /**
   * 创建 Connection
   */
  constructor(options: ConnectionOptions) {
    super();

    assert.ok(options, `missing options`);
    assert.ok(Array.isArray(options.connections), `connections must be an array`);
    assert.ok(options.connections.length >= 1, `connections must includes at least one item`);

    this.options = Object.assign<any, ConnectionOptions>({}, options);
    if (!("stripEmoji" in this.options)) {
      this.options.stripEmoji = true;
    }

    this.poolCluster = mysql.createPoolCluster();
    this.poolCluster.add("MASTER", options.connections[0]);
    options.connections.slice(1).forEach((config, index) => {
      this.poolCluster.add(`SLAVE${index}`, config);
    });

    this.poolCluster.on("error", err => this.emit("error", err));
    this.poolCluster.on("connection", connection => this.emit("connection", connection));
    this.poolCluster.on("enqueue", () => this.emit("enqueue"));
  }

  protected get poolMaster(): mysql.Pool {
    return this.poolCluster.of("MASTER");
  }

  protected get poolSlave(): mysql.Pool {
    return this.poolCluster.of("SLAVE*");
  }

  public on(event: "error", callback: (err: Error) => void): this;
  public on(event: "connection", callback: (conn: Connection) => void): this;
  public on(event: "enqueue", callback: () => void): this;
  public on(event: "query", callback: (data: QueryEventData) => void): this;
  public on(event: "result", callback: (data: ResultEventData) => void): this;
  public on(event: ConnectionEvent, callback: (...args: any[]) => void): this {
    return super.on(event, callback);
  }

  public once(event: "error", callback: (err: Error) => void): this;
  public once(event: "connection", callback: (conn: Connection) => void): this;
  public once(event: "enqueue", callback: () => void): this;
  public once(event: "query", callback: (data: QueryEventData) => void): this;
  public once(event: "result", callback: (data: ResultEventData) => void): this;
  public once(event: ConnectionEvent, callback: (...args: any[]) => void): this {
    return super.once(event, callback);
  }

  public emit(event: "error", err: Error): boolean;
  public emit(event: "connection", conn: Connection): boolean;
  public emit(event: "enqueue"): boolean;
  public emit(event: "query", data: QueryEventData): boolean;
  public emit(event: "result", data: ResultEventData): boolean;
  public emit(event: ConnectionEvent, ...data: any[]): boolean {
    return super.emit(event, ...data);
  }

  /**
   * 关闭连接
   */
  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.poolCluster.end(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  /**
   * 获取一个原始连接
   */
  public getConnection(): Promise<WrappedConnection> {
    return this.getConnectionFromPool(this.poolCluster);
  }

  /**
   * 获取一个 MASTER 连接
   */
  public getMasterConnection(): Promise<WrappedConnection> {
    return this.getConnectionFromPool(this.poolMaster);
  }

  /**
   * 获取一个 SLAVE 连接
   */
  public getSlaveConnection(): Promise<WrappedConnection> {
    return this.getConnectionFromPool(this.poolSlave);
  }

  /**
   * 智能查询，更新操作会在 MASTER 执行，其他在任意服务器查询
   * @param sql 要执行的 SQL 查询语句
   */
  public query(sql: string): Promise<any> {
    if (utils.isUpdateSQL(sql)) {
      return this.queryMaster(sql);
    }
    return this.queryFromPool(this.poolCluster, sql);
  }

  /**
   * 在 MASTER 上执行查询
   * @param sql 要执行的 SQL 查询语句
   */
  public queryMaster(sql: string): Promise<any> {
    return this.queryFromPool(this.poolMaster, sql);
  }

  /**
   * 在 SLAVE 上执行查询
   * @param sql 要执行的 SQL 查询语句
   */
  public querySlave(sql: string): Promise<any> {
    return this.queryFromPool(this.poolSlave, sql);
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
  protected getConnectionFromPool(pool: MysqlPool): Promise<WrappedConnection> {
    return new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          return reject(err);
        }
        resolve(wrapConnection(connection));
      });
    });
  }

  /**
   * 执行 SQL 查询
   * @param pool 连接池
   * @param sql  SQL 查询语句
   */
  protected queryFromPool(pool: MysqlPool, sql: string): Promise<any> {
    return new Promise((resolve, reject) => {
      utils.connectionDebug("query sql: %s", sql);
      pool.getConnection((err, connection) => {
        if (err) {
          return reject(err);
        }
        const cc = connection.config || {};
        const timestamp = Date.now();
        const connectionName = `${cc.host}:${cc.port}`;
        const id = utils.generateRequestId();
        this.emit("query", { id, sql, connection, name: connectionName, timestamp });
        if (this.options.stripEmoji) {
          sql = utils.stripEmoji(sql);
        }
        connection.query(sql, (err2: QueryError | null, ret) => {
          connection.release();
          const spent = Date.now() - timestamp;
          this.emit("result", { id, sql, connection, name: connectionName, timestamp, spent, data: ret, error: err2 });
          // 如果查询出错，在 Error 对象中附加当前正在查询的 SQL 语句
          if (err2) {
            err2.sql = sql;
            return reject(err2);
          }
          resolve(ret);
        });
      });
    });
  }
}
