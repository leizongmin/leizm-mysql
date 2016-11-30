/**
 * super-orm typings define
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import Redis = require('ioredis');
import mysql = require('mysql');


interface ICacheOptions {
  redis: Redis.RedisOptions;
  ttl: number;
  prefix: string;
}

interface ICacheItem {
  key: string;
  data: string;
}

declare class Cache extends NodeJS.EventEmitter {
  constructor(options: ICacheOptions);
  close(callback?: (err: Error) => void): Promise<any>;
  saveList(list: ICacheItem[], callback?: (err: Error, ret: string[]) => void): Promise<string[]>;
  getList(list: string[], callback?: (err: Error, ret: string[]) => void): Promise<string[]>;
  removeList(list: string[], callback?: (err: Error, ret: string[]) => void): Promise<string[]>;
}

declare function createCache(options: ICacheOptions): Cache;

interface IConnectionOptions {
  connections: mysql.IPoolConfig[];
}

interface IMySQLConnection {
  query(sql: string, values?: any[], callback?: (err: Error, ret: any) => void): Promise<any>;
  beginTransaction(callback?: (err: Error) => void): Promise<any>;
  commit(callback?: (err: Error) => void): Promise<any>;
  rollback(callback?: () => void): Promise<any>;
  pause(): void;
  release(): void;
  resume(): void;
}

declare class Connection extends NodeJS.EventEmitter {
  constructor(options: IConnectionOptions);
  close(callback?: (err: Error) => void): Promise<any>;
  getConnection(callback?: (err: Error, ret: IMySQLConnection) => void): Promise<IMySQLConnection>;
  getMasterConnection(callback?: (err: Error, ret: IMySQLConnection) => void): Promise<IMySQLConnection>;
  getSlaveConnection(callback?: (err: Error, ret: IMySQLConnection) => void): Promise<IMySQLConnection>;
  query(sql: string, callback?: (err: Error, ret: any) => void): Promise<any>;
  queryMaster(sql: string, callback?: (err: Error, ret: any) => void): Promise<any>;
  querySlave(sql: string, callback?: (err: Error, ret: any) => void): Promise<any>;
  escape(value: string): string;
  escapeId(value: string): string;
  format(sql: string, values?: any[] | any): string;
}

declare function createConnection(options: IConnectionOptions): Connection;

interface IQueryBuilderOptions {
  table: string;
  exec(sql: string, callback?: (err: Error, ret: any) => void);
}

interface IQueryOptionsParams {
  skip: number;
  limit: number;
  order: string;
  fields: string[];
}

declare class QueryBuilder {
  constructor(options: IQueryBuilderOptions);
  format(tpl: string, values?: any[] | any): string;
  where(condition: string | any, values?: any[] | any): QueryBuilder;
  and(condition: string | any, values?: any[] | any): QueryBuilder;
  select(...fields: string[]): QueryBuilder;
  fields(...fields: string[]): QueryBuilder;
  count(name: string): QueryBuilder;
  update(update?: string | any, values?: any[] | any): QueryBuilder;
  set(update: string | any, values?: any[] | any): QueryBuilder;
  insert(data: any[] | any): QueryBuilder;
  delete(): QueryBuilder;
  sql(sql: string, values?: any[] | any): QueryBuilder;
  order(tpl: string, values?: any[] | any): QueryBuilder;
  skip(rows: number): QueryBuilder;
  limit(rows: number): QueryBuilder;
  options(options: IQueryOptionsParams): QueryBuilder;
  build(): string;
  exec(callback?: (err: Error, ret: any) => void): Promise<any>;
}

declare function createQueryBuilder(options: IQueryBuilderOptions): QueryBuilder;

interface ISchemaOptions {
  fields: any;
}

declare class Schema {
  constructor(options: ISchemaOptions);
  formatInput(data: any): any;
  formatInputList(data: any[]): any[];
  formatOutput(data: any): any;
  formatOutputList(data: any[]): any[];
  serialize(data: any): string;
  unserialize(data: string): any;
}

declare function createSchema(options: ISchemaOptions): Schema;

interface IModelBaseOptions extends ISchemaOptions {
  table: string;
  primary?: string | string[],
  autoIncrement?: boolean;
}

interface IModelOptions extends IModelBaseOptions {
  connection: Connection,
  cache: Cache,
}

interface IModelQueryOptions {
  format: boolean,
  callback(err: Error, ret: any, callback?: (err: Error, ret: any) => void): void,
}

declare class Model {
  constructor(options: IModelOptions);
  getPrimaryCacheKey(data: any, strict: boolean): string;
  keepPrimaryFields(data: any): any;
  saveCache(data: any[] | any, callback?: (err: Error, ret: string[]) => void): Promise<string[]>;
  removeCache(data: any[] | any, callback?: (err: Error, ret: string[]) => void): Promise<string[]>;
  cacheCache(data: any[] | any, callback?: (err: Error, ret: any[]) => void): Promise<any[]>;
  query(options: IModelQueryOptions): QueryBuilder;
  find(): QueryBuilder;
  findOne(): QueryBuilder;
  count(): QueryBuilder;
  update(update: string | any, values?: any[] | any): QueryBuilder;
  updateOne(update: string | any, values?: any[] | any): QueryBuilder;
  incr(update: any): QueryBuilder;
  delete(): QueryBuilder;
  deleteOne(): QueryBuilder;
  insert(data: any[] | any): QueryBuilder;
  sql(sql: string, values?: any[] | any): QueryBuilder;
  getByPrimary(query: any, callback?: (err: Error, ret: any) => void): Promise<any>;
  updateByPrimary(query: any, update: any, callback?: (err: Error, ret: any) => void): Promise<any>;
  deleteByPrimary(query: any, callback?: (err: Error, ret: any) => void): Promise<any>;
}

declare function createModel(options: IModelOptions): Model;

interface IManagerOptions extends ICacheOptions, IConnectionOptions {}

declare class Manager extends NodeJS.EventEmitter {
  constructor(options: IManagerOptions);
  cache: Cache;
  connection: Connection;
  close(callback?: (err: Error) => void): Promise<any>;
  registerModel(name: string, options: IModelBaseOptions): void;
  hasModel(name: string): boolean;
  model(name: string): Model;
}

declare function createManager(options: IManagerOptions): Manager;
