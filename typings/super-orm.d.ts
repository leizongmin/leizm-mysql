/**
 * super-orm typings define
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import Redis = require('ioredis');
import mysql = require('mysql');


interface ICacheOptions {
  /**
   * Redis 连接信息
   */
  redis: Redis.RedisOptions;
  /**
   * 缓存时间，单位：秒
   */
  ttl: number;
  /**
   * Redis Key 前缀
   */
  prefix: string;
}

interface ICacheItem {
  /**
   * 缓存Key
   */
  key: string;
  /**
   * 数据
   */
  data: string;
}

declare class Cache extends NodeJS.EventEmitter {
  /**
   * 创建 Cache 实例
   */
  constructor(options: ICacheOptions);
  /**
   * 释放资源
   */
  close(callback?: (err: Error) => void): Promise<any>;
  /**
   * 存储缓存
   */
  saveList(list: ICacheItem[], callback?: (err: Error, ret: string[]) => void): Promise<string[]>;
  /**
   * 查询缓存
   */
  getList(list: string[], callback?: (err: Error, ret: string[]) => void): Promise<string[]>;
  /**
   * 删除缓存
   */
  removeList(list: string[], callback?: (err: Error, ret: string[]) => void): Promise<string[]>;
}

/**
 * 创建 Cache 实例
 */
declare function createCache(options: ICacheOptions): Cache;

interface IConnectionOptions {
  /**
   * MySQL 数据库连接数组
   */
  connections: mysql.IPoolConfig[];
}

interface IMySQLConnection {
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

declare class Connection extends NodeJS.EventEmitter {
  /**
   * 创建 Connection 实例
   * @param options 选项
   */
  constructor(options: IConnectionOptions);
  /**
   * 释放资源
   * @param callback 回调函数
   */
  close(callback?: (err: Error) => void): Promise<any>;
  /**
   * 获取一个可用连接
   * @param callback 回调函数
   */
  getConnection(callback?: (err: Error, ret: IMySQLConnection) => void): Promise<IMySQLConnection>;
  /**
   * 获取一个可用的 Master 连接
   * @param callback 回调函数
   */
  getMasterConnection(callback?: (err: Error, ret: IMySQLConnection) => void): Promise<IMySQLConnection>;
  /**
   * 获取一个可用的 Slave 连接
   * @param callback 回调函数
   */
  getSlaveConnection(callback?: (err: Error, ret: IMySQLConnection) => void): Promise<IMySQLConnection>;
  /**
   * 执行查询
   * @param sql SQL 语句
   * @param callback 回调函数
   */
  query(sql: string, callback?: (err: Error, ret: any) => void): Promise<any>;
  /**
   * 在 Master 上执行查询
   * @param sql SQL 语句
   * @param callback 回调函数
   */
  queryMaster(sql: string, callback?: (err: Error, ret: any) => void): Promise<any>;
  /**
   * 在 Slave 上执行查询
   * @param sql SQL 语句
   * @param callback 回调函数
   */
  querySlave(sql: string, callback?: (err: Error, ret: any) => void): Promise<any>;
  /**
   * 格式化数据
   * @param value 数据
   */
  escape(value: string): string;
  /**
   * 格式化 ID
   * @param value ID 名称
   */
  escapeId(value: string): string;
  /**
   * 格式化 SQL 查询语句
   * @param tpl SQL 查询
   * @param values 模板变量
   */
  format(sql: string, values?: any[] | any): string;
}

/**
 * 创建 Connection 实例
 * @param options 选项
 */
declare function createConnection(options: IConnectionOptions): Connection;

interface IQueryBuilderOptions {
  /**
   * 表名
   */
  table: string;
  /**
   * 执行查询
   * @param sql SQL 语句
   * @param callback 回调函数
   */
  exec(sql: string, callback?: (err: Error, ret: any) => void);
}

interface IQueryOptionsParams {
  /**
   * 跳过的行数
   */
  skip: number;
  /**
   * 返回的行数
   */
  limit: number;
  /**
   * 排序方向
   */
  order: string;
  /**
   * 返回字段列表
   */
  fields: string[];
}

declare class QueryBuilder {
  /**
   * 创建查询生成器
   * @param options 选项
   */
  constructor(options: IQueryBuilderOptions);
  /**
   * 格式化 SQL 查询语句
   * @param tpl SQL 查询
   * @param values 模板变量
   */
  format(tpl: string, values?: any[] | any): string;
  /**
   * 查询条件
   * @param condition SQL 语句
   * @param values 模板变量
   */
  where(condition: string | any, values?: any[] | any): QueryBuilder;
  /**
   * 查询条件
   * @param condition SQL 语句
   * @param values 模板变量
   */
  and(condition: string | any, values?: any[] | any): QueryBuilder;
  /**
   * 查询的字段
   * @param fields 字段列表
   */
  select(...fields: string[]): QueryBuilder;
  /**
   * 查询的字段
   * @param fields 字段列表
   */
  fields(...fields: string[]): QueryBuilder;
  /**
   * 查询数量
   * @param 返回的字段名
   */
  count(name: string): QueryBuilder;
  /**
   * 更新
   * @param update 数据对象或 SQL 语句
   * @param values 模板变量
   */
  update(update?: string | any, values?: any[] | any): QueryBuilder;
  /**
   * 更新
   * @param update 数据对象或 SQL 语句
   * @param values 模板变量
   */
  set(update: string | any, values?: any[] | any): QueryBuilder;
  /**
   * 插入
   * @param data 一行数据或数组
   */
  insert(data: any[] | any): QueryBuilder;
  /**
   * 删除
   */
  delete(): QueryBuilder;
  /**
   * 原始 SQL 查询
   * @param sql SQL 语句
   * @param values 模板变量
   */
  sql(sql: string, values?: any[] | any): QueryBuilder;
  /**
   * 排序方向
   * @param tpl SQL 语句
   * @param values 模板变量
   */
  order(tpl: string, values?: any[] | any): QueryBuilder;
  /**
   * 跳过指定行数
   * @param rows 行数
   */
  skip(rows: number): QueryBuilder;
  /**
   * 仅返回指定数量结果
   * @param rows 行数
   */
  limit(rows: number): QueryBuilder;
  /**
   * 快速设置
   * @param options 选项
   */
  options(options: IQueryOptionsParams): QueryBuilder;
  /**
   * 生成 SQL 语句
   */
  build(): string;
  /**
   * 执行查询
   * @param callback 回调函数
   */
  exec(callback?: (err: Error, ret: any) => void): Promise<any>;
}

/**
 * 创建查询生成器
 * @param options 选项
 */
declare function createQueryBuilder(options: IQueryBuilderOptions): QueryBuilder;

interface ISchemaOptions {
  /**
   * 字段定义
   */
  fields: {
    [key: string]: boolean | string | ISchemaField;
  };
}

interface ISchemaField {
  /**
   * 格式化输入的函数
   * @param data 数据
   */
  input?: (data: any) => any;
  /**
   * 格式化输出的函数
   * @param data 数据
   */
  output?: (data: any) => any;
  /**
   * 序列化的函数
   * @param data 数据
   */
  encode?: (data: any) => any;
  /**
   * 反序列化的函数
   * @param data 数据
   */
  decode?: (data: any) => any;
  /**
   * 类型
   */
  type?: string;
}

declare class Schema {
  /**
   * 创建 Schema 实例
   * @param options 选项
   */
  constructor(options: ISchemaOptions);
  /**
   * 格式化输入
   * @param data 数据
   */
  formatInput(data: any): any;
  /**
   * 格式化输入数组
   * @param data 数组
   */
  formatInputList(data: any[]): any[];
  /**
   * 格式化输出
   * @param data 数据
   */
  formatOutput(data: any): any;
  /**
   * 格式化输出数组
   * @param data 数据
   */
  formatOutputList(data: any[]): any[];
  /**
   * 序列化成字符串
   */
  serialize(data: any): string;
  /**
   * 反序列化成对象
   */
  unserialize(data: string): any;
}

/**
 * 创建 Schema 实例
 * @param options 选项
 */
declare function createSchema(options: ISchemaOptions): Schema;

interface IModelBaseOptions extends ISchemaOptions {
  /**
   * 表名
   */
  table: string;
  /**
   * 主键
   */
  primary?: string | string[],
  /**
   * 主键是否自增
   */
  autoIncrement?: boolean;
}

interface IModelOptions extends IModelBaseOptions {
  /**
   * Connection 实例
   */
  connection: Connection,
  /**
   * Cache 实例
   */
  cache: Cache,
}

interface IModelQueryOptions {
  /**
   * 是否自动格式化查询结果
   */
  format: boolean,
  /**
   * 回调函数
   */
  callback(err: Error, ret: any, callback?: (err: Error, ret: any) => void): void,
}

declare class Model {
  /**
   * 创建 Model 实例
   * @param options 选项
   */
  constructor(options: IModelOptions);
  /**
   * 取数据主键的 Key
   * @param data 数据
   * @param strict 是否严格检查每个键的数据都存在
   */
  getPrimaryCacheKey(data: any, strict: boolean): string;
  /**
   * 仅保留主键的数据
   * @param data 数据
   */
  keepPrimaryFields(data: any): any;
  /**
   * 存储缓存
   * @param data 数据，可以为一组
   * @param callback 回调函数
   */
  saveCache(data: any[] | any, callback?: (err: Error, ret: string[]) => void): Promise<string[]>;
  /**
   * 删除缓存
   * @param data 数据，可以为一组
   * @param callback 回调函数
   */
  removeCache(data: any[] | any, callback?: (err: Error, ret: string[]) => void): Promise<string[]>;
  /**
   * 查询缓存
   * @param data 数据，可以为一组
   * @param callback 回调函数
   */
  getCache(data: any[] | any, callback?: (err: Error, ret: any[]) => void): Promise<any[]>;
  /**
   * 查询
   * @param options 选项
   */
  query(options: IModelQueryOptions): QueryBuilder;
  /**
   * 查询列表
   */
  find(): QueryBuilder;
  /**
   * 查询一行
   */
  findOne(): QueryBuilder;
  /**
   * 查询数据
   */
  count(): QueryBuilder;
  /**
   * 更新
   * @param update 数据
   * @prram values 模板变量
   */
  update(update: string | any, values?: any[] | any): QueryBuilder;
  /**
   * 更新一行
   * @param update 数据
   * @prram values 模板变量
   */
  updateOne(update: string | any, values?: any[] | any): QueryBuilder;
  /**
   * 自增
   * @param update 数据
   */
  incr(update: any): QueryBuilder;
  /**
   * 删除
   */
  delete(): QueryBuilder;
  /**
   * 删除一行
   */
  deleteOne(): QueryBuilder;
  /**
   * 插入
   */
  insert(data: any[] | any): QueryBuilder;
  /**
   * 执行原始 SQL 查询
   * @param sql SQL 语句
   * @param values 模板变量
   */
  sql(sql: string, values?: any[] | any): QueryBuilder;
  /**
   * 查询主键数据
   * @param query 主键
   * @param callback 回调函数
   */
  getByPrimary(query: any, callback?: (err: Error, ret: any) => void): Promise<any>;
  /**
   * 更新主键数据
   * @param query 主键
   * @param update 要更新的数据
   * @param callback 回调函数
   */
  updateByPrimary(query: any, update: any, callback?: (err: Error, ret: any) => void): Promise<any>;
  /**
   * 删除主键数据
   * @param query 主键
   * @param callback 回调函数
   */
  deleteByPrimary(query: any, callback?: (err: Error, ret: any) => void): Promise<any>;
}

/**
 * 创建 Model 实例
 * @param options 选项
 */
declare function createModel(options: IModelOptions): Model;

interface IManagerOptions extends ICacheOptions, IConnectionOptions {}

declare class Manager extends NodeJS.EventEmitter {
  /**
   * 创建 Manager 实例
   * @param options 选项
   */
  constructor(options: IManagerOptions);
  /**
   * Cache 实例
   */
  cache: Cache;
  /**
   * Connection 实例
   */
  connection: Connection;
  /**
   * 释放资源
   * @param callback 回调函数
   */
  close(callback?: (err: Error) => void): Promise<any>;
  /**
   * 注册 Model
   * @param name Model 名称
   * @param options 选项
   */
  registerModel(name: string, options: IModelBaseOptions): void;
  /**
   * Model 是否存在
   * @param name Mode 名称
   */
  hasModel(name: string): boolean;
  /**
   * 获取 Model
   * @param name Model 名称
   */
  model(name: string): Model;
}

/**
 * 创建 Manager 实例
 * @param options 选项
 */
declare function createManager(options: IManagerOptions): Manager;
