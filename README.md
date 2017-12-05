# @leizm/mysql

基于 Node.js/TypeScript 的 MySQL 连接管理器

## 安装

```bash
npm install @leizm/mysql --save
```

## 环境要求

* Node.js v6.0 及更高版本 - 运行环境
* MySQL 5.6 及更高版本 - SQL 数据存储
* Redis 2.6 及更高版本 - 缓存存储

## 使用方法

```typescript
import { Manager } from "@leizm/mysql";

const manager = new Manager({
  // Redis 连接，用于缓存
  // 参考 https://github.com/luin/ioredis/blob/master/API.md#new_Redis
  redis: {
    host: "127.0.0.1",
    port: 6379,
    db: 0,
    password: ""
  },
  // 缓存 key 前缀
  prefix: "TEST:",
  // 缓存世界，秒
  ttl: 60,
  // MySQL 连接，可指定多个，第一个为 Master，其余为 Slave
  // 参考 https://www.npmjs.com/package/mysql#connection-options
  connections: [
    {
      host: "127.0.0.1",
      port: 3306,
      user: "root",
      password: "",
      database: "test",
      connectionLimit: 10,
      charset: "utf8mb4"
    },
    {
      host: "127.0.0.1",
      port: 13306,
      user: "root",
      password: "",
      database: "test",
      connectionLimit: 10,
      charset: "utf8mb4"
    }
  ]
});

// 注册 Table
manager.registerTable({
  table: "users",
  primary: "id",
  autoIncrement: true,
  fields: {
    // true 表示该字段存在
    id: true,
    name: true,
    email: true,
    // 可指定字段为 json 类型，在存储是会自动对数据执行 JSON.stringify()，读取时执行 JSON.parse()
    // 或自定义 encode 和 decode 方法
    info: "json",
    created_at: "date"
    // 其它未定义的字段在存储时会被自动过滤
  }
});

// 使用 Table
const ret = await manager.table("users").getByPrimary({ id: 123 });
console.log(ret);

// 使用原始连接执行查询，SELECT 语句会在任意连接执行，其它语句只在 Master 连接执行
const ret2 = await manager.connection.query("CREATE TABLE `hello`");
console.log(ret2);

// 事务（在 Master 连接执行）
(async function() {
  const conn = await manager.connection.getMasterConnection();
  // 开始事务
  await conn.beginTransaction();
  try {
    await conn.query("INSERT INTO `hello`...");
    await conn.query("INSERT INTO `hello`...");
    await conn.query("INSERT INTO `hello`...");
    // 提交事务
    await conn.commit();
  } catch (err) {
    // 回滚事务
    await conn.rollback();
  }
  // 释放连接
  await conn.release();
})();
```

## License

```text
MIT License

Copyright (c) 2016-2018 Zongmin Lei <leizongmin@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
