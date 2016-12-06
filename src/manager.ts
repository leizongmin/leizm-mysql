/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import assert = require("assert");
import events = require("events");
import coroutine = require("lei-coroutine");
import cache = require("./cache");
import connection = require("./connection");
import model = require("./model");
import utils = require("./utils");

export interface ManagerOptions extends cache.CacheOptions, connection.ConnectionOptions {}

export class Manager extends events.EventEmitter {

  public readonly cache: cache.Cache;
  public readonly connection: connection.Connection;
  private readonly _models: Map<string, model.Model>;

  /**
   * 创建 Manager
   */
  constructor(options: ManagerOptions) {
    super();

    this.cache = new cache.Cache(options);
    this.connection = new connection.Connection(options);

    this._models = new Map();
  }

  /**
   * 注册 model
   * @param name Model 名称
   * @param options 选项
   */
  public registerModel(name: string, options: model.ModelBaseOptions) {
    assert.equal(typeof name, "string", `model name must be a string`);
    assert.ok(name, `model name cannot be empty`);
    assert.ok(options, `please provide options`);
    const m = new model.Model(Object.assign({
      connection: this.connection,
      cache: this.cache,
    }, options));
    this._models.set(name, m);
  }

  /**
   * 判断 model 是否存在
   * @param name Model 名称
   */
  public hasModel(name: string): boolean {
    return this._models.has(name);
  }

  /**
   * 获取 model
   * @param name Model 名称
   */
  public model(name: string): model.Model {
    if (!this._models.has(name)) {
      throw new Error(`model "${ name }" does not exists`);
    }
    return this._models.get(name);
  }

  /**
   * 关闭
   * @param callback 回调函数
   */
  public close(callback?: utils.CallbackFunction<void>): Promise<void> | void {
    callback = utils.tryCreatePromiseCallback(callback);
    const self = this;
    coroutine(function* () {
      yield self.cache.close();
      yield self.connection.close();
      self._models.clear();
    }).then(() => callback(null)).catch(err => callback(err));
    return callback.promise;
  }

}
