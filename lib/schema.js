'use strict';

/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const assert = require('assert');


/**
 * 获取默认的 field 配置信息
 *
 * @return {Object}
 */
function getDefaultFieldInfo() {
  return {};
}

/**
 * 获取指定 type 的 field 配置信息
 *
 * @param {String} type
 * @return {Object}
 */
function getFieldInfoByType(type) {
  switch (type.toLowerCase()) {
  case 'json':
    return { input: jsonInputFormatter, output: jsonOutputFormatter };
  case 'bool':
    return { input: boolInputFormatter, output: boolOutputFormatter };
  case 'date':
    return { input: dateInputFormatter, output: dateOutputFormatter };
  default:
    throw new TypeError(`not support type "${ type }"`);
  }
}

function jsonInputFormatter(v) {
  return JSON.stringify(v);
}

function jsonOutputFormatter(v) {
  if (v === undefined) return undefined;
  if (v === null) return {};
  if (typeof v !== 'string') throw new TypeError(`jsonOutputFormatter: invalid input type: ${ v }`);
  if (v === '') return {};
  try {
    return JSON.parse(v);
  } catch (err) {
    throw new TypeError(`jsonOutputFormatter: fail to parse JSON: ${ err.message }`);
  }
}

function boolInputFormatter(v) {
  return v ? 1 : 0;
}

function boolOutputFormatter(v) {
  return !!v;
}

function dateInputFormatter(v) {
  return v;
}

function dateOutputFormatter(v) {
  return new Date(v);
}


class Schema {

  /**
   * 创建 Schema
   *
   * @param {Object} options
   *   - {Object} fields 格式为 { name: info }
   *                     info 格式为： true表示任意类型，或者提供编码解码器： { input, output } ,或者提供 { type } 生成默认的编码解码器
   */
  constructor(options) {
    options = Object.assign({}, options || {});

    assert.ok(options.fields, `must provide fields`);
    assert.ok(typeof options.fields === 'object', `fields must be an object`);
    this._fields = {};
    for (const name in options.fields) {
      const info = options.fields[name];
      assert.ok(info, `options for field "${ name }" must be true or object`);
      if (info === true) {
        this._fields[name] = getDefaultFieldInfo();
        continue;
      }
      if (info.type) {
        assert.ok(typeof info.type === 'string' && info.type, `type for field "${ name }" must be a string`);
        this._fields[name] = getFieldInfoByType(info.type);
        continue;
      }
      assert.ok(info.input, `field "${ name }" must provide an input formatter`);
      assert.ok(typeof info.input === 'function', `input formatter for field "${ name }" must be a function`);
      assert.ok(info.output, `field "${ name }" must provide a output formatter`);
      assert.ok(typeof info.output === 'function', `output formatter for field "${ name }" must be a function`);
      this._fields[name] = { input: info.input, output: info.output };
    }
  }

  /**
   * 格式化输入数据
   *
   * @param {Object} data
   * @return {Object}
   */
  formatInput(data) {
    const ret = {};
    for (const name in data) {
      const field = this._fields[name];
      // 自动去掉不存在的字段
      if (field) {
        if (field.output) {
          ret[name] = field.input(data[name]);
        } else {
          ret[name] = data[name];
        }
      }
    }
    return ret;
  }

  /**
   * 格式化输入数据数组
   *
   * @param {Array} list
   * @return {Array}
   */
  formatInputList(list) {
    return list.map(item => this.formatInput(item));
  }

  /**
   * 格式化输出数据
   *
   * @param {Object} data
   * @return {Object}
   */
  formatOutput(data) {
    const ret = {};
    for (const name in data) {
      const field = this._fields[name];
      // 不处理不存在的字段
      if (field && field.output) {
        ret[name] = field.output(data[name]);
      } else {
        ret[name] = data[name];
      }
    }
    return ret;
  }

  /**
   * 格式化输出数据数组
   *
   * @param {Array} list
   * @return {Array}
   */
  formatOutputList(list) {
    return list.map(item => this.formatOutput(item));
  }

  /**
   * 序列化
   *
   * @param {Object} data
   * @return {String}
   */
  serialize(data) {
    return JSON.stringify(data);
  }

  /**
   * 反序列化
   *
   * @param {String} data
   * @return {Object}
   */
  unserialize(data) {
    return JSON.parse(data);
  }

}

module.exports = Schema;
