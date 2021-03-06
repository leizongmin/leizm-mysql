/**
 * @leizm/mysql tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import { expect } from "chai";
import * as mysql from "../lib";
import * as utils from "./utils";

const prefix = utils.randomString(10) + ":";
const cache = new mysql.Cache(utils.getCacheConfig({ prefix }));
const connection = new mysql.Connection({
  connections: [utils.getConnectionConfig()],
});
const table = new mysql.Table({
  cache,
  connection,
  table: "user_blogs",
  primary: ["blog_id", "user_id"],
  fields: {
    blog_id: true,
    user_id: true,
    info: "json",
    created_at: "date",
    score: true,
  },
});

beforeAll(async function() {
  const sql = await utils.readTestFile("user_blogs.sql");
  await connection.query("DROP TABLE IF EXISTS `user_blogs`");
  await connection.query(sql);
});

afterAll(async function() {
  await connection.close();
  await cache.close();
});

test("insert", async function() {
  const data = {
    blog_id: 1,
    user_id: 1001,
    info: {
      mem: process.memoryUsage(),
      uptime: process.uptime(),
    },
    created_at: utils.newDate(),
    score: 0,
  };
  {
    const ret = await table.insert(data);
    utils.debug(ret);
    expect(ret.length).to.equal(1);
  }
  {
    const ret = await table
      .findOne()
      .where(table.keepPrimaryFields(data))
      .exec();
    utils.debug(ret);
    expect(ret).to.deep.equal(data);
  }
  // 批量插入
  {
    const ret = await table.insert([
      {
        blog_id: 2,
        user_id: 1001,
        created_at: utils.newDate(),
        info: {
          message: "hello, world",
        },
      },
      {
        blog_id: 3,
        user_id: 1002,
        created_at: utils.newDate(),
        info: null,
      },
    ]);
    utils.debug(ret);
    expect(ret.length).to.equal(2);
  }
});

test("find", async function() {
  {
    const list = await table
      .find()
      .where({ user_id: 1001 })
      .exec();
    utils.debug(list);
    expect(list).to.have.lengthOf(2);
  }
  {
    const list = await table
      .find()
      .orderBy("`blog_id` DESC")
      .exec();
    utils.debug(list);
    expect(list).to.have.lengthOf(3);
    const list2 = list.slice();
    utils.debug(list2);
    list.sort((a: any, b: any) => b.blog_id - a.blog_id);
    expect(list).to.deep.equal(list2);
  }
});

test("findOne", async function() {
  {
    const ret = await table
      .findOne()
      .where({ user_id: 1001 })
      .exec();
    utils.debug(ret);
    expect(ret.user_id).to.equal(1001);
  }
});

test("count", async function() {
  {
    const count = await table.count().exec();
    utils.debug(count);
    expect(count).to.equal(3);
  }
  {
    const count = await table
      .count()
      .where({ user_id: 1001 })
      .exec();
    utils.debug(count);
    expect(count).to.equal(2);
  }
  {
    const count = await table
      .count()
      .where("`user_id`!=1001")
      .exec();
    utils.debug(count);
    expect(count).to.equal(1);
  }
});

test("sql", async function() {
  {
    const ret = await table.sql("SELECT COUNT(*) AS `count` FROM :$table").exec();
    utils.debug(ret);
    expect(ret).to.deep.equal([{ count: 3 }]);
  }
  {
    const ret = await table.sql("SHOW TABLES").exec();
    utils.debug(ret);
  }
});

test("update #1", async function() {
  const data = {
    info: {
      mem: process.memoryUsage(),
      uptime: process.uptime(),
      time: Date.now(),
    },
  };
  const query = {
    blog_id: 1,
    user_id: 1001,
  };
  {
    const ret = await table
      .update(data)
      .where(query)
      .exec();
    utils.debug(ret);
    expect(ret.affectedRows).to.equal(1);
    expect(ret.changedRows).to.equal(1);
  }
  {
    const ret = await table
      .findOne()
      .where(query)
      .exec();
    utils.debug(ret);
    expect(ret.info).to.deep.equal(data.info);
    expect(ret.blog_id).to.equal(query.blog_id);
    expect(ret.user_id).to.equal(query.user_id);
  }
});

test("update #2", async function() {
  const info = {
    pid: process.pid,
    uptime: process.uptime(),
  };
  const created_at = utils.newDate();
  const query = {
    user_id: 1001,
  };
  {
    const ret = await table
      .update("`info`=?, `created_at`=?", [JSON.stringify(info), created_at])
      .where(query)
      .exec();
    utils.debug(ret);
    expect(ret.affectedRows).to.equal(2);
    expect(ret.changedRows).to.equal(2);
  }
  {
    const ret = await table
      .find()
      .where(query)
      .exec();
    utils.debug(ret);
    expect(ret).to.have.lengthOf(2);
    for (const item of ret) {
      expect(item.info).to.deep.equal(info);
      expect(item.user_id).to.equal(query.user_id);
      expect(item.blog_id).to.be.oneOf([1, 2]);
    }
  }
});

test("updateOne", async function() {
  // 等待一段时间以使得  created_at 时间不一样
  await utils.sleep(1500);
  const info = {
    message: "from updateOne",
  };
  const created_at = utils.newDate();
  const user_id = 1001;
  {
    const ret = await table
      .updateOne("`info`=:info, `created_at`=:created_at", {
        info: JSON.stringify(info),
        created_at,
      })
      .where({ user_id })
      .orderBy("`id` ASC")
      .exec();
    utils.debug(ret);
    expect(ret.affectedRows).to.equal(1);
    expect(ret.changedRows).to.equal(1);
  }
  {
    const ret = await table.find().exec();
    utils.debug(ret);
    for (const item of ret) {
      if (item.user_id === user_id && item.created_at.getTime() === created_at.getTime()) {
        expect(item.info).to.deep.equal(info);
      } else {
        expect(item.info).to.not.deep.equal(info);
      }
    }
  }
});

test("incr", async function() {
  {
    const ret = await table
      .incr({ score: 5 })
      .where({ blog_id: 3 })
      .exec();
    utils.debug(ret);
    expect(ret.affectedRows).to.equal(1);
    expect(ret.changedRows).to.equal(1);
  }
  {
    const ret = await table
      .findOne()
      .where({ blog_id: 3 })
      .exec();
    utils.debug(ret);
    expect(ret.score).to.equal(5);
  }
});

test("deleteOne", async function() {
  {
    const ret = await table
      .deleteOne()
      .where({ user_id: 1001 })
      .exec();
    utils.debug(ret);
    expect(ret.affectedRows).to.equal(1);
  }
  {
    const count = await table.count().exec();
    expect(count).to.equal(2);
  }
});

test("delete", async function() {
  {
    const ret = await table.delete().exec();
    utils.debug(ret);
    expect(ret.affectedRows).to.equal(2);
  }
  {
    const count = await table.count().exec();
    expect(count).to.equal(0);
  }
});

test("insert undeifned value", async function() {
  {
    const ret = await table.insert({
      blog_id: 2001,
      user_id: 3,
      created_at: undefined,
      info: undefined,
      score: undefined,
    });
    utils.debug(ret);
    expect(ret.length).to.equal(1);
  }
  {
    const ret = await table
      .findOne()
      .where({ blog_id: 2001 })
      .exec();
    utils.debug(ret);
    expect(ret).to.include({
      blog_id: 2001,
      user_id: 3,
      score: 0,
    });
    expect(ret.info).to.deep.equal(null);
  }
});
