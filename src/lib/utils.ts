/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import * as createDebug from "debug";
import * as mysql from "mysql";
import * as utils from "lei-utils";
import { Callback } from "./define";

// TODO: 不知为何无法正确识别 d.ts 文件
const emojiRegex = require("emoji-regex");

declare module "mysql" {
  function escapeId(value: string): string;
}

export * from "lei-utils";

/**
 * 根据指定名称生成 debug 函数
 * @param name 名称
 */
export function debug(name: string): createDebug.IDebugger {
  return createDebug("super-orm:" + name);
}

export const modelDebug = debug("model");
export const schemaDebug = debug("schema");
export const connectionDebug = debug("connection");
export const managerDebug = debug("manager");
export const cacheDebug = debug("cache");
export const queryDebug = debug("query");
export const otherDebug = debug("other");

export const sqlEscape = mysql.escape;
export const sqlEscapeId = mysql.escapeId;
export const sqlFormat = mysql.format;

/**
 * 如果传入的 callback 参数不存在，尝试创建支持 Promise 的回调函数
 * @param callback 回调函数
 */
export function wrapCallback<T>(callback?: Callback<T>): Callback<T> {
  if (callback) {
    return callback;
  }
  return utils.createPromiseCallback();
}

/**
 * 返回格式化后的 SQL 语句
 * 格式： SELECT * FROM ::table WHERE `title`=:title
 * @param sql SQL 模板语句
 * @param values 参数对象
 * @param disable$ 是否没有 $ 开头的 key
 */
export function sqlFormatObject(
  sql: string,
  values: Record<string, any>,
  disable$?: boolean
): string {
  values = values || {};
  return sql.replace(/:((:)?[\w$]+)/g, (txt, key) => {
    const isId = key[0] === ":";
    if (isId) {
      key = key.slice(1);
    }
    if (values.hasOwnProperty(key)) {
      if (disable$) {
        return values[key];
      }
      if (isId) {
        return sqlEscapeId(values[key]);
      }
      return sqlEscape(values[key]);
    }
    return txt;
  });
}

/**
 * 判断是否为 Connection 实例
 * @param conn 任意对象
 */
export function isConnectionInstance(conn: any): boolean {
  return (
    conn &&
    conn._poolCluster &&
    typeof conn.getConnection === "function" &&
    typeof conn.getMasterConnection === "function" &&
    typeof conn.getSlaveConnection === "function" &&
    typeof conn.query === "function" &&
    typeof conn.queryMaster === "function" &&
    typeof conn.querySlave === "function" &&
    typeof conn.escape === "function" &&
    typeof conn.escapeId === "function" &&
    typeof conn.format === "function"
  );
}

/**
 * 判断是否为 Cache 实例
 * @param cache 任意对象
 */
export function isCacheInstance(cache: any): boolean {
  return (
    cache &&
    cache._redis &&
    typeof cache.saveList === "function" &&
    typeof cache.removeList === "function" &&
    typeof cache.getList === "function"
  );
}

/**
 * 返回根据对象生成的 SQL UPDATE 语句
 * @param data 键值对对象
 */
export function sqlUpdateString(data: Record<string, any>): string {
  return Object.keys(data)
    .map(name => `${sqlEscapeId(name)}=${sqlEscape(data[name])}`)
    .join(", ");
}

/**
 * 返回生成 SQL LIMIT 语句
 * @param skip 跳过的行数
 * @param limit 返回的行数
 */
export function sqlLimitString(skip: number, limit: number): string {
  skip = Number(skip);
  limit = Number(limit);
  if (limit > 0) {
    if (skip > 0) {
      return `LIMIT ${skip},${limit}`;
    }
    return `LIMIT ${limit}`;
  }
  return `LIMIT ${skip},18446744073709551615`;
}

/**
 * 判断是否为更新操作的 SQL
 * @param sql SQL 语句
 */
export function isUpdateSQL(sql: string): boolean {
  return !/^SELECT\s/.test(sql);
}

/**
 * 合并多段文本
 * @param strs 文本数组
 */
export function joinMultiString(...strs: string[]): string {
  return strs
    .map(v => v.trim())
    .filter(v => v)
    .join(" ");
}

/**
 * 判断是否每个键都存在
 */
export function everyFieldExists(
  data: Record<string, any>,
  fields: string[]
): boolean {
  for (const f of fields) {
    if (!(f in data)) {
      return false;
    }
  }
  return true;
}

/**
 * 删除emoji字符
 */
export function stripEmoji(text: string): string {
  return text.replace(emojiRegex(), "");
}
