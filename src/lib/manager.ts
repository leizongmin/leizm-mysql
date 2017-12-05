/**
 * @leizm/mysql
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import * as assert from "assert";
import * as events from "events";
import * as cache from "./cache";
import * as connection from "./connection";
import * as table from "./table";
import * as utils from "./utils";
import { Callback } from "./define";

export interface ManagerOptions
  extends cache.CacheOptions,
    connection.ConnectionOptions {}

export class Manager extends events.EventEmitter {
  public readonly cache: cache.Cache;
  public readonly connection: connection.Connection;
  private readonly _tables: Map<string, table.Table>;

  /**
   * 创建 Manager
   */
  constructor(options: ManagerOptions) {
    super();

    this.cache = new cache.Cache(options);
    this.connection = new connection.Connection(options);

    this._tables = new Map();
  }

  /**
   * 注册 table
   * @param name Table 名称
   * @param options 选项
   */
  public registerTable(name: string, options: table.TableBaseOptions) {
    assert.equal(typeof name, "string", `table name must be a string`);
    assert.ok(name, `table name cannot be empty`);
    assert.ok(options, `please provide options`);
    const m = new table.Table(
      Object.assign(
        {
          connection: this.connection,
          cache: this.cache
        },
        options
      )
    );
    this._tables.set(name, m);
  }

  /**
   * 判断 table 是否存在
   * @param name Table 名称
   */
  public hasTable(name: string): boolean {
    return this._tables.has(name);
  }

  /**
   * 获取 table
   * @param name Table 名称
   */
  public table(name: string): table.Table {
    if (!this._tables.has(name)) {
      throw new Error(`table "${name}" does not exists`);
    }
    return this._tables.get(name) as table.Table;
  }

  /**
   * 关闭
   * @param callback 回调函数
   */
  public close(callback?: Callback<void>): Promise<void> | void {
    const cb = utils.wrapCallback(callback);
    (async () => {
      await this.cache.close();
      await this.connection.close();
      this._tables.clear();
    })()
      .then(() => cb(null))
      .catch(err => cb(err));
    return cb.promise;
  }
}
