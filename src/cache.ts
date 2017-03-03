/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import assert = require('assert');
import events = require('events');
import Redis = require('ioredis');
import utils = require('./utils');
import { Callback } from './define';

const GET_BY_POINTER_SCRIPT = `
local k = redis.call("get", KEYS[1])
if (k) then
  return redis.call("get", k)
end
`.trim();

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
    this._redis.on('error', (err: Error) => {
      this.emit('error', err);
    });

    assert.ok(options.ttl, `missing ttl parameter`);
    assert.ok(options.ttl > 0, `parameter ttl must > 0`);
    this._ttl = Number(options.ttl);

    this._prefix = options.prefix || '';
  }

  /**
   * 获取 redis 实例
   */
  get redis(): Redis.Redis {
    return this._redis;
  }

  /**
   * 保存到缓存
   * @param list 每个元素为 { key, data }
   */
  public saveList(list: CacheDataItem[]): Promise<string[]>;
  /**
   * 保存到缓存
   * @param list 每个元素为 { key, data }
   * @param callback 回调函数
   */
  public saveList(list: CacheDataItem[], callback: Callback<string[]>): void;

  public saveList(list: CacheDataItem[], callback?: Callback<string[]>): Promise<string[]> | void {
    const cb = utils.wrapCallback(callback);
    if (list && list.length > 0) {
      const p = this._redis.multi();
      const keys: string[] = [];
      for (const item of list) {
        const key = this._getKey(item.key);
        keys.push(key);
        p.setex(key, this._ttl, item.data);
      }
      p.exec(err => cb(err, keys));
    } else {
      process.nextTick(() => cb(null, []));
    }
    return cb.promise;
  }

  /**
   * 保存到缓存
   * @param item 数据 { key, data }
   */
  public saveItem(item: CacheDataItem): Promise<string>;
  /**
   * 保存到缓存
   * @param item 数据 { key, data }
   * @param callback 回调函数
   */
  public saveItem(item: CacheDataItem, callback: Callback<string>): void;

  public saveItem(item: CacheDataItem, callback?: Callback<string>): Promise<string> | void {
    const cb = utils.wrapCallback(callback);
    this.saveList([ item ], (err, list) => {
      cb(err, list && list[0]);
    });
    return cb.promise;
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
  public getList(keys: string[], callback: Callback<string[]>): void;

  public getList(keys: string[], callback?: Callback<string[]>): Promise<string[]> | void {
    const cb = utils.wrapCallback(callback);
    if (keys && keys.length > 0) {
      keys = keys.map(key => this._getKey(key));
      this._redis.mget(keys, cb);
    } else {
      process.nextTick(() => cb(null, []));
    }
    return cb.promise;
  }

  /**
   * 查询缓存
   * @param key
   */
  public getItem(key: string): Promise<string>;
  /**
   * 查询缓存
   * @param key
   * @param callback 回调函数
   */
  public getItem(key: string, callback: Callback<string>): void;

  public getItem(key: string, callback?: Callback<string>): Promise<string> | void {
    const cb = utils.wrapCallback(callback);
    this.getList([ key ], (err, list) => {
      cb(err, list && list[0]);
    });
    return cb.promise;
  }

  /**
   * 从缓存中缓存
   * @param keys
   */
  public removeList(list: string[]): Promise<string[]>;
  /**
   * 从缓存中缓存
   * @param keys
   * @param callback 回调函数
   */
  public removeList(list: string[], callback: Callback<string[]>): void;

  public removeList(list: string[], callback?: Callback<string[]>): Promise<string[]> | void {
    const cb = utils.wrapCallback(callback);
    if (list && list.length > 0) {
      const p = this._redis.multi();
      const keys: string[] = [];
      for (const item of list) {
        const key = this._getKey(item);
        keys.push(key);
        p.del(key);
      }
      p.exec(err => cb(err, keys));
    } else {
      process.nextTick(() => cb(null, []));
    }
    return cb.promise;
  }

  /**
   * 删除缓存
   * @param key
   */
  public removeItem(key: string): Promise<string>;
  /**
   * 删除缓存
   * @param key
   * @param callback 回调函数
   */
  public removeItem(key: string, callback: Callback<string>): void;

  public removeItem(key: string, callback?: Callback<string>): Promise<string> | void {
    const cb = utils.wrapCallback(callback);
    this.removeList([ key ], (err, list) => {
      cb(err, list && list[0]);
    });
    return cb.promise;
  }

  /**
   * 查询缓存(key的内容指向另一个key)
   * @param key
   */
  public getPointerItem(key: string): Promise<string>;
  /**
   * 查询缓存(key的内容指向另一个key)
   * @param key
   */
  public getPointerItem(key: string, callback: Callback<string>): void;

  public getPointerItem(key: string, callback?: Callback<string>): Promise<string> | void {
    const cb = utils.wrapCallback(callback);
    this._redis.eval(GET_BY_POINTER_SCRIPT, 1, this._getKey(key), cb);
    return cb.promise;
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
    this._redis.quit(cb);
    return cb.promise;
  }

  /**
   * 返回实际的 Key
   * @param key 原来的 key
   */
  private _getKey(key: string): string {
    return this._prefix + key;
  }

}
