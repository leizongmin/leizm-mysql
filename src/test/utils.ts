/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import * as fs from "fs";
import * as path from "path";
import * as orm from "../lib";
import * as mysql from "mysql";
import * as utils from "lei-utils";

export const randomString = utils.randomString;

export function getConnectionConfig(
  config?: mysql.IPoolConfig
): mysql.IPoolConfig {
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

export function getCacheConfig(config?: any): orm.ManagerOptions {
  return Object.assign<any, orm.ManagerOptions>(
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
