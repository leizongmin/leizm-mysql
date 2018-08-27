/**
 * @leizm/mysql
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import * as assert from "assert";
import * as events from "events";
import * as Redis from "ioredis";

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
  public readonly redis: Redis.Redis;
  protected ttl: number;
  protected prefix: string;

  /**
   * 创建 Cache 实例
   */
  constructor(options: CacheOptions) {
    super();

    assert.ok(options, `missing options`);
    assert.ok(options.redis, `missing redis parameter`);

    options = Object.assign<any, CacheOptions>({}, options);

    this.redis = new Redis(options.redis);
    this.redis.on("error", (err: Error) => {
      this.emit("error", err);
    });

    assert.ok(options.ttl, `missing ttl parameter`);
    assert.ok(options.ttl > 0, `parameter ttl must > 0`);
    this.ttl = Number(options.ttl);

    this.prefix = options.prefix || "";
  }

  /**
   * 保存到缓存
   * @param list 每个元素为 { key, data }
   */
  public async saveList(list: CacheDataItem[]): Promise<string[]> {
    if (list && list.length > 0) {
      const p = this.redis.multi();
      const keys: string[] = [];
      for (const item of list) {
        const key = this.getKey(item.key);
        keys.push(key);
        p.setex(key, this.ttl, item.data);
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
      keys = keys.map(key => this.getKey(key));
      return await this.redis.mget(keys[0], ...keys.slice(1));
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
      const p = this.redis.multi();
      const keys: string[] = [];
      for (const item of list) {
        const key = this.getKey(item);
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
    return this.redis.eval(GET_BY_POINTER_SCRIPT, 1, this.getKey(key));
  }

  /**
   * 关闭连接
   */
  public close(): Promise<string> {
    return this.redis.quit() as any;
  }

  /**
   * 返回实际的 Key
   * @param key 原来的 key
   */
  public getKey(key: string): string {
    return this.prefix + key;
  }
}
