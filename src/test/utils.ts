/**
 * @leizm/mysql tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import * as fs from "fs";
import * as path from "path";
import * as mysql from "../lib";
import * as utils from "lei-utils";
import * as createDebug from "debug";

export const debug = createDebug("@leizm/mysql:test");

export const randomString = utils.randomString;

export function getConnectionConfig(
  config?: mysql.PoolConfig
): mysql.PoolConfig {
  return Object.assign(
    {
      host: "127.0.0.1",
      port: 3306,
      user: "root",
      password: "",
      database: "test",
      connectionLimit: 2,
      charset: "utf8mb4"
    },
    config || {}
  );
}

export function getCacheConfig(config?: any): mysql.ManagerOptions {
  return Object.assign<any, mysql.ManagerOptions>(
    {
      redis: {
        host: "127.0.0.1",
        port: 6379,
        db: 15
      },
      prefix: "TEST:",
      ttl: 30
    },
    config || {}
  );
}

export function readFile(file: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    fs.readFile(file, (err, ret) => {
      if (err) {
        reject(err);
      } else {
        resolve(ret);
      }
    });
  });
}

export async function readTestFile(file: string) {
  const data = await readFile(path.resolve(__dirname, "../../test", file));
  return data.toString();
}

export function newDate(v?: any): Date {
  const d = (v ? new Date(v) : new Date()).getTime();
  return new Date(parseInt((d / 1000).toString(), 10) * 1000);
}

export function sleep(ms: number): Promise<number> {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(ms), ms);
  });
}
