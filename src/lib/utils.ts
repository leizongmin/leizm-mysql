/**
 * @leizm/mysql
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import * as assert from "assert";
import * as createDebug from "debug";
import * as mysql from "mysql";
import { QueryBuilder } from "./query";

// TODO: 不知为何无法正确识别 d.ts 文件
const emojiRegex = require("emoji-regex");

export * from "lei-utils";

/**
 * 根据指定名称生成 debug 函数
 * @param name 名称
 */
export function debug(name: string): createDebug.IDebugger {
  return createDebug("@leizm/mysql:" + name);
}

export const tableDebug = debug("table");
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
 * 返回格式化后的 SQL 语句
 * 格式： SELECT * FROM ::table WHERE `title`=:title
 * @param sql SQL 模板语句
 * @param values 参数对象
 * @param disable$ 是否没有 $ 开头的 key
 */
export function sqlFormatObject(sql: string, values: Record<string, any>, disable$?: boolean): string {
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
    conn.poolCluster &&
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
 * 判断是否为 IConnectionBase 实例
 * @param conn 任意对象
 */
export function isConnectionBaseInstance(conn: any): boolean {
  return conn && typeof conn.query === "function" && typeof conn.queryMaster === "function";
}

/**
 * 判断是否为 Cache 实例
 * @param cache 任意对象
 */
export function isCacheInstance(cache: any): boolean {
  return (
    cache &&
    cache.redis &&
    typeof cache.saveList === "function" &&
    typeof cache.removeList === "function" &&
    typeof cache.getList === "function"
  );
}

/**
 * 返回根据对象生成的 SQL UPDATE 语句
 * @param self QueryBuilder实例
 * @param data 键值对对象
 */
export function sqlUpdateString(self: QueryBuilder, data: Record<string, any>): string {
  return Object.keys(data)
    .map(name => {
      const info = data[name];
      const isJsonField = self._schema && self._schema.isJsonField(name);
      const escapedName = sqlEscapeId(name);
      if (info && typeof info === "object" && Object.keys(info).length === 1 && !isJsonField) {
        const op = Object.keys(info)[0];
        switch (op) {
          case "$incr":
            return `${escapedName}=${escapedName}+${sqlEscape(info.$incr)}`;
          default:
            throw new Error(`update type ${op} does not supported`);
        }
      } else {
        return `${escapedName}=${sqlEscape(data[name])}`;
      }
    })
    .join(", ");
}

/**
 * 返回根据对象生成的 SQL WHERE 语句
 * @param self QueryBuilder实例
 * @param condition 查询条件
 */
export function sqlConditionStrings(self: QueryBuilder, condition: Record<string, any>): string[] {
  const ret: string[] = [];
  for (const name in condition as any) {
    const info = (condition as any)[name];
    const isJsonField = self._schema && self._schema.isJsonField(name);
    const escapedName = sqlEscapeId(name);
    if (info && typeof info === "object" && Object.keys(info).length === 1 && !isJsonField) {
      const op = Object.keys(info)[0];
      switch (op) {
        case "$in":
          assert.ok(Array.isArray(info.$in), `value for condition type $in in field ${name} must be an array`);
          ret.push(`${escapedName} IN (${info.$in.map((v: any) => sqlEscape(v)).join(", ")})`);
          break;
        case "$like":
          assert.ok(typeof info.$like === "string", `value for condition type $like in ${name} must be a string`);
          ret.push(`${escapedName} LIKE ${sqlEscape(info.$like)}`);
          break;
        default:
          throw new Error(`condition type ${op} does not supported`);
      }
    } else {
      ret.push(`${escapedName}=${sqlEscape((condition as any)[name])}`);
    }
  }
  return ret;
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
export function everyFieldExists(data: Record<string, any>, fields: string[]): boolean {
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

/**
 * 查找值为undefined的key列表
 * @param data
 */
export function findKeysForUndefinedValue(data: Record<string, any>): string[] {
  return Object.keys(data).filter(k => typeof data[k] === "undefined");
}

/**
 * 生成RequestID
 */
export function generateRequestId(): string {
  return `${Date.now()}.${Math.random()
    .toString()
    .slice(2)}`;
}
