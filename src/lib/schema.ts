/**
 * @leizm/mysql
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import * as assert from "assert";

/**
 * 获取默认的 field 配置信息
 */
function getDefaultFieldInfo(): Record<string, any> {
  return {};
}

/**
 * 获取指定 type 的 field 配置信息
 * @param type 类型
 */
function getFieldInfoByType(type: string): Record<string, any> {
  switch (type.toLowerCase()) {
    case "json":
      return { input: jsonInputFormatter, output: jsonOutputFormatter };
    case "bool":
      return { input: boolInputFormatter, output: boolOutputFormatter };
    case "date":
      return { encode: dateInputEncoder, decode: dateOutputDecoder };
    default:
      throw new TypeError(`not support type "${type}"`);
  }
}

function jsonInputFormatter(v: any): string {
  return JSON.stringify(v);
}

function jsonOutputFormatter(v: any): any {
  // 如果为undefined，表示没有查询该字段，应该保持返回undefined
  // 如果为null，表示未设置过数据，应该返回null
  // 如果为空字符串，表示已设置过数据，可以返回空对象来兼容
  if (v === undefined || v === null) {
    return v;
  }
  if (typeof v !== "string") {
    throw new TypeError(`jsonOutputFormatter: invalid input type: ${JSON.stringify(v)}`);
  }
  if (v === "") {
    return {};
  }
  try {
    return JSON.parse(v);
  } catch (err) {
    throw new TypeError(`jsonOutputFormatter: fail to parse JSON: ${err.message}`);
  }
}

function boolInputFormatter(v: any): number {
  if (v === false || v === undefined || v === null || v === 0) {
    return 0;
  }
  v = String(v).toLowerCase();
  if (v === "" || v === "no" || v === "off" || v === "false" || v === "0") {
    return 0;
  }
  return 1;
}

function boolOutputFormatter(v: any): boolean {
  return !!v;
}

function dateInputEncoder(v: any): any {
  return v;
}

function dateOutputDecoder(v: any): Date {
  return new Date(v);
}

export interface SchemaOptions {
  /**
   * 字段定义，格式为 { name: info }
   * info 格式为： true表示任意类型，或者提供编码解码器： { input, output } ,或者提供 'type' 生成默认的编码解码器
   */
  fields: SchemaFields;
}

export interface SchemaFields {
  [key: string]: boolean | "json" | "date" | "bool" | SchemaField;
}

export const FieldType = {
  Any: true,
  JSON: "json" as "json",
  Date: "date" as "date",
  Boolean: "bool" as "bool",
};

export interface SchemaField {
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

export class Schema {
  protected fields: SchemaFields;

  /**
   * 创建 Schema
   */
  constructor(options: SchemaOptions) {
    assert.ok(options, `missing options`);
    assert.ok(options.fields, `must provide fields`);
    assert.ok(typeof options.fields === "object", `fields must be an object`);

    this.fields = {};
    for (const name in options.fields) {
      const type = options.fields[name];
      assert.ok(type, `options for field "${name}" must be true or object`);
      if (type === true) {
        this.fields[name] = getDefaultFieldInfo();
        continue;
      } else if (typeof type === "string") {
        this.fields[name] = getFieldInfoByType(type);
        continue;
      } else {
        const info = options.fields[name] as SchemaField;
        assert.ok(info.input, `field "${name}" must provide an input formatter`);
        assert.ok(typeof info.input === "function", `input formatter for field "${name}" must be a function`);
        assert.ok(info.output, `field "${name}" must provide a output formatter`);
        assert.ok(typeof info.output === "function", `output formatter for field "${name}" must be a function`);
        this.fields[name] = { input: info.input, output: info.output };
      }
    }
  }

  /**
   * 格式化输入数据
   * @param data 输入的键值对数据
   */
  public formatInput(data: Record<string, any>): Record<string, any> {
    const ret: Record<string, any> = {};
    for (const name in data) {
      const field = this.fields[name];
      // 自动去掉不存在的字段和值为 undefined 的字段
      if (field && typeof data[name] !== "undefined") {
        const fieldInfo = field as SchemaField;
        if (fieldInfo.input) {
          ret[name] = fieldInfo.input(data[name]);
        } else {
          ret[name] = data[name];
        }
      }
    }
    return ret;
  }

  /**
   * 格式化输入数据数组
   * @param list 输入的键值对数据数组
   */
  public formatInputList(list: Array<Record<string, any>>): Array<Record<string, any>> {
    return list.map(item => this.formatInput(item));
  }

  /**
   * 格式化输出数据
   * @param data 输入的键值对数据
   */
  public formatOutput(data: Record<string, any>): Record<string, any> {
    const ret: Record<string, any> = {};
    for (const name in data) {
      const field = this.fields[name];
      const fieldInfo = field as SchemaField;
      // 不处理不存在的字段
      if (field && fieldInfo.output) {
        ret[name] = fieldInfo.output(data[name]);
      } else {
        ret[name] = data[name];
      }
    }
    return ret;
  }

  /**
   * 格式化输出数据数组
   * @param list 输入的键值对数据数组
   */
  public formatOutputList(list: Array<Record<string, any>>): Array<Record<string, any>> {
    return list.map(item => this.formatOutput(item));
  }

  /**
   * 序列化
   * @param data 要序列化的键值对数据
   */
  public serialize(data: Record<string, any>): string {
    data = Object.assign({}, data);
    for (const name in data) {
      const field = this.fields[name];
      const fieldInfo = field as SchemaField;
      if (field && fieldInfo.encode) {
        data[name] = fieldInfo.encode(data[name]);
      }
    }
    return JSON.stringify(data);
  }

  /**
   * 反序列化
   * @param data 要反序列化的数据
   */
  public unserialize(data: string): Record<string, any> {
    const ret = JSON.parse(data);
    for (const name in ret) {
      const field = this.fields[name];
      const fieldInfo = field as SchemaField;
      if (field && fieldInfo.decode) {
        ret[name] = fieldInfo.decode(ret[name]);
      }
    }
    return ret;
  }

  /**
   * 判断是否为JSON字段
   * @param name 字段名
   */
  public isJsonField(name: string): boolean {
    return this.fields[name] && this.fields[name] === "json";
  }
}
