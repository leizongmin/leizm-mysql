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

export interface ManagerOptions extends cache.CacheOptions, connection.ConnectionOptions {}

export class Manager extends events.EventEmitter {
  public readonly cache: cache.Cache;
  public readonly connection: connection.Connection;
  protected readonly tables: Map<string, table.Table>;

  /**
   * 创建 Manager
   */
  constructor(options: ManagerOptions) {
    super();

    this.cache = new cache.Cache(options);
    this.connection = new connection.Connection(options);

    this.tables = new Map();
  }

  /**
   * 注册 table
   * @param name Table 名称
   * @param options 选项
   */
  public registerTable(options: table.TableBaseOptions) {
    assert.ok(options, `please provide options`);
    assert.equal(typeof options.table, "string", `table name must be a string`);
    assert.ok(options.table, `table name cannot be empty`);
    const m = new table.Table(
      Object.assign(
        {
          connection: this.connection,
          cache: this.cache,
        },
        options,
      ),
    );
    this.tables.set(options.table, m);
  }

  /**
   * 判断 table 是否存在
   * @param name Table 名称
   */
  public hasTable(name: string): boolean {
    return this.tables.has(name);
  }

  /**
   * 获取 table
   * @param name Table 名称
   */
  public table(name: string): table.Table {
    if (!this.tables.has(name)) {
      throw new Error(`table "${name}" does not exists`);
    }
    return this.tables.get(name) as table.Table;
  }

  /**
   * 关闭
   */
  public async close(): Promise<void> {
    await this.cache.close();
    await this.connection.close();
    this.tables.clear();
  }
}
