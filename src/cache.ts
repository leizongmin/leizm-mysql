/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import assert = require("assert");
import events = require("events");
import Redis = require("ioredis");
import utils = require("./utils");

export interface CacheOptions {
  /**
   * Redis 连接信息
   * {host, port, password, db }
   * 参考 https://github.com/luin/ioredis/blob/master/API.md#new_Redis
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

export interface CacheDataItem {
  /**
   * 缓存Key
   */
  key: string;
  /**
   * 数据
   */
  data: string;
}

export class Cache extends events.EventEmitter {

  private _redis: Redis.Redis;
  private _ttl: number;
  private _prefix: string;

  /**
   * 创建 Cache 实例
   */
  constructor(options: CacheOptions) {
    super();

    assert.ok(options, `missing options`);
    assert.ok(options.redis, `missing redis parameter`);

    options = Object.assign<any, CacheOptions>({}, options);

    this._redis = new Redis(options.redis);
    this._redis.on("error", (err: Error) => {
      this.emit("error", err);
    });

    assert.ok(options.ttl, `missing ttl parameter`);
    assert.ok(options.ttl > 0, `parameter ttl must > 0`);
    this._ttl = Number(options.ttl);

    this._prefix = options.prefix || "";
  }

  /**
   * 返回实际的 Key
   * @param key 原来的 key
   */
  public _getKey(key: string): string {
    return this._prefix + key;
  }

  /**
   * 保存到缓存
   * @param list 每个元素为 { key, data }
   * @param callback 回调函数
   */
  public saveList(list: CacheDataItem[]): Promise<string[]>;
  /**
   * 保存到缓存
   * @param list 每个元素为 { key, data }
   * @param callback 回调函数
   */
  public saveList(list: CacheDataItem[], callback: utils.CallbackFunction<string[]>): void;

  public saveList(list: CacheDataItem[], callback?: utils.CallbackFunction<string[]>): Promise<string[]> | void {
    callback = utils.tryCreatePromiseCallback<string[]>(callback);
    const p = this._redis.multi();
    const keys: string[] = [];
    for (const item of list) {
      const key = this._getKey(item.key);
      keys.push(key);
      p.setex(key, this._ttl, item.data);
    }
    p.exec(err => callback(err, keys));
    return callback.promise;
  }

  /**
   * 查询缓存
   * @param keys key 数组
   */
  public getList(keys: string[]): Promise<string[]>;
  /**
   * 查询缓存
   * @param keys key 数组
   * @param callback 回调函数
   */
  public getList(keys: string[], callback: utils.CallbackFunction<string[]>): void;

  public getList(keys: string[], callback?: utils.CallbackFunction<string[]>): Promise<string[]> | void {
    callback = utils.tryCreatePromiseCallback<string[]>(callback);
    keys = keys.map(key => this._getKey(key));
    this._redis.mget(keys, callback);
    return callback.promise;
  }

  /**
   * 从缓存中缓存
   * @param keys 每个元素为 { key, data }
   */
  public removeList(list: string[]): Promise<string[]>;
  /**
   * 从缓存中缓存
   * @param keys 每个元素为 { key, data }
   * @param callback 回调函数
   */
  public removeList(list: string[], callback: utils.CallbackFunction<string[]>): void;

  public removeList(list: string[], callback?: utils.CallbackFunction<string[]>): Promise<string[]> | void {
    callback = utils.tryCreatePromiseCallback<string[]>(callback);
    const p = this._redis.multi();
    const keys: string[] = [];
    for (const item of list) {
      const key = this._getKey(item);
      keys.push(key);
      p.del(key);
    }
    p.exec(err => callback(err, keys));
    return callback.promise;
  }

  /**
   * 关闭连接
   */
  public close(): Promise<void>;
  /**
   * 关闭连接
   * @param callback 回调函数
   */
  public close(callback: utils.CallbackFunction<void>): void;

  public close(callback?: utils.CallbackFunction<void>): Promise<void> | void {
    callback = utils.tryCreatePromiseCallback<void>(callback);
    this._redis.quit(callback);
    return callback.promise;
  }

}
