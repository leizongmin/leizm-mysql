/**
 * @leizm/mysql
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import * as assert from 'assert';
import * as events from 'events';
import * as Redis from 'ioredis';
import * as utils from './utils';
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
  public async saveList(list: CacheDataItem[]): Promise<string[]> {
    if (list && list.length > 0) {
      const p = this._redis.multi();
      const keys: string[] = [];
      for (const item of list) {
        const key = this._getKey(item.key);
        keys.push(key);
        p.setex(key, this._ttl, item.data);
      }
      await p.exec();
      return keys;
    }
    return [];
  }

  /**
   * 保存到缓存
   * @param item 数据 { key, data }
   */
  public async saveItem(item: CacheDataItem): Promise<string> {
    const keys = await this.saveList([item]);
    return keys[0];
  }

  /**
   * 查询缓存
   * @param keys key 数组
   */
  public async getList(keys: string[]): Promise<string[]> {
    if (keys && keys.length > 0) {
      keys = keys.map(key => this._getKey(key));
      return await this._redis.mget(keys[0], ...keys.slice(1));
    }
    return [];
  }

  /**
   * 查询缓存
   * @param key
   */
  public async getItem(key: string): Promise<string> {
    const list = await this.getList([key]);
    return list[0];
  }

  /**
   * 从缓存中缓存
   * @param keys
   */
  public async removeList(list: string[]): Promise<string[]> {
    if (list && list.length > 0) {
      const p = this._redis.multi();
      const keys: string[] = [];
      for (const item of list) {
        const key = this._getKey(item);
        keys.push(key);
        p.del(key);
      }
      await p.exec();
      return keys;
    }
    return [];
  }

  /**
   * 删除缓存
   * @param key
   */
  public async removeItem(key: string): Promise<string> {
    const list = await this.removeList([key]);
    return list[0];
  }

  /**
   * 查询缓存(key的内容指向另一个key)
   * @param key
   */
  public getPointerItem(key: string): Promise<string> {
    return this._redis.eval(GET_BY_POINTER_SCRIPT, 1, this._getKey(key));
  }

  /**
   * 关闭连接
   */
  public close(): Promise<string> {
    return this._redis.quit();
  }

  /**
   * 返回实际的 Key
   * @param key 原来的 key
   */
  private _getKey(key: string): string {
    return this._prefix + key;
  }
}
