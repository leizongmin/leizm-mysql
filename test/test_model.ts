/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import chai = require("chai");
import coroutine = require("lei-coroutine");
import orm = require("../");
import utils = require("./utils");

const expect = chai.expect;

describe("Model - normal", function () {

  const prefix = utils.randomString(10) + ":";
  const cache = orm.createCache(utils.getCacheConfig({ prefix }));
  const connection = orm.createConnection({ connections: [ utils.getConnectionConfig() ]});
  const model = orm.createModel({
    cache, connection,
    table: "user_blogs",
    primary: [ "blog_id", "user_id" ],
    fields: {
      blog_id: true,
      user_id: true,
      info: "json",
      created_at: "date",
      score: true,
    },
  });

  before(coroutine.wrap(function* () {
    const sql = yield utils.readTestFile("user_blogs.sql");
    yield connection.query("DROP TABLE IF EXISTS `user_blogs`");
    yield connection.query(sql);
  }));

  after(coroutine.wrap(function* () {
    yield connection.close();
    yield cache.close();
  }));

  it("insert", coroutine.wrap(function* () {
    const data = {
      blog_id: 1,
      user_id: 1001,
      info: {
        mem: process.memoryUsage(),
        uptime: process.uptime(),
      },
      created_at: new Date(),
      score: 0,
    };
    {
      const ret = yield model.insert(data).exec();
      console.log(ret);
      expect(ret.affectedRows).to.equal(1);
    }
    {
      const ret = yield model.findOne().where(model.keepPrimaryFields(data)).exec();
      console.log(ret);
      expect(ret).to.deep.equal(data);
    }
    // 批量插入
    {
      const ret = yield model.insert([{
        blog_id: 2,
        user_id: 1001,
        created_at: new Date(),
        info: {
          message: "hello, world",
        },
      }, {
        blog_id: 3,
        user_id: 1002,
        created_at: new Date(),
        info: null,
      }]).exec();
      console.log(ret);
      expect(ret.affectedRows).to.equal(2);
    }
  }));

  it("find", coroutine.wrap(function* () {
    {
      const list = yield model.find().where({ user_id: 1001 }).exec();
      console.log(list);
      expect(list).to.have.lengthOf(2);
    }
    {
      const list = yield model.find().orderBy("`blog_id` DESC").exec();
      console.log(list);
      expect(list).to.have.lengthOf(3);
      const list2 = list.slice();
      console.log(list2);
      list.sort((a: any, b: any) => b.blog_id - a.blog_id);
      expect(list).to.deep.equal(list2);
    }
  }));

  it("findOne", coroutine.wrap(function* () {
    {
      const ret = yield model.findOne().where({ user_id: 1001 }).exec();
      console.log(ret);
      expect(ret.user_id).to.equal(1001);
    }
  }));

  it("count", coroutine.wrap(function* () {
    {
      const count = yield model.count().exec();
      console.log(count);
      expect(count).to.equal(3);
    }
    {
      const count = yield model.count().where({ user_id: 1001 }).exec();
      console.log(count);
      expect(count).to.equal(2);
    }
    {
      const count = yield model.count().where("`user_id`!=1001").exec();
      console.log(count);
      expect(count).to.equal(1);
    }
  }));

  it("sql", coroutine.wrap(function* () {
    {
      const ret = yield model.sql("SELECT COUNT(*) AS `count` FROM :$table").exec();
      console.log(ret);
      expect(ret).to.deep.equal([{ count: 3 }]);
    }
    {
      const ret = yield model.sql("SHOW TABLES").exec();
      console.log(ret);
    }
  }));

  it("update #1", coroutine.wrap(function* () {
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
      const ret = yield model.update(data).where(query).exec();
      console.log(ret);
      expect(ret.affectedRows).to.equal(1);
      expect(ret.changedRows).to.equal(1);
    }
    {
      const ret = yield model.findOne().where(query).exec();
      console.log(ret);
      expect(ret.info).to.deep.equal(data.info);
      expect(ret.blog_id).to.equal(query.blog_id);
      expect(ret.user_id).to.equal(query.user_id);
    }
  }));

  it("update #2", coroutine.wrap(function* () {
    const info = {
      pid: process.pid,
      uptime: process.uptime(),
    };
    const created_at = new Date();
    const query = {
      user_id: 1001,
    };
    {
      const ret = yield model.update("`info`=?, `created_at`=?", [ JSON.stringify(info), created_at ])
                          .where(query).exec();
      console.log(ret);
      expect(ret.affectedRows).to.equal(2);
      expect(ret.changedRows).to.equal(2);
    }
    {
      const ret = yield model.find().where(query).exec();
      console.log(ret);
      expect(ret).to.have.lengthOf(2);
      for (const item of ret) {
        expect(item.info).to.deep.equal(info);
        expect(item.user_id).to.equal(query.user_id);
        expect(item.blog_id).to.be.oneOf([ 1, 2 ]);
      }
    }
  }));

  it("updateOne", coroutine.wrap(function* () {
    const info = {
      message: "from updateOne",
    };
    const created_at = new Date();
    const user_id = 1001;
    {
      const ret = yield model.updateOne("`info`=:info, `created_at`=:created_at", {
        info: JSON.stringify(info),
        created_at,
      }).where({ user_id }).orderBy("`id` ASC").exec();
      console.log(ret);
      expect(ret.affectedRows).to.equal(1);
      expect(ret.changedRows).to.equal(1);
    }
    {
      const ret = yield model.find().exec();
      console.log(ret);
      for (const item of ret) {
        if (item.user_id === user_id && item.created_at.getTime() === created_at.getTime()) {
          expect(item.info).to.deep.equal(info);
        } else {
          expect(item.info).to.not.deep.equal(info);
        }
      }
    }
  }));

  it("incr", coroutine.wrap(function* () {
    {
      const ret = yield model.incr({ score: 5 }).where({ blog_id: 3 }).exec();
      console.log(ret);
      expect(ret.affectedRows).to.equal(1);
      expect(ret.changedRows).to.equal(1);
    }
    {
      const ret = yield model.findOne().where({ blog_id: 3 }).exec();
      console.log(ret);
      expect(ret.score).to.equal(5);
    }
  }));

  it("deleteOne", coroutine.wrap(function* () {
    {
      const ret = yield model.deleteOne().where({ user_id: 1001 }).exec();
      console.log(ret);
      expect(ret.affectedRows).to.equal(1);
    }
    {
      const count = yield model.count().exec();
      expect(count).to.equal(2);
    }
  }));

  it("delete", coroutine.wrap(function* () {
    {
      const ret = yield model.delete().exec();
      console.log(ret);
      expect(ret.affectedRows).to.equal(2);
    }
    {
      const count = yield model.count().exec();
      expect(count).to.equal(0);
    }
  }));

  it("insert undeifned value", async function () {
    {
      const ret = await model.insert({
        blog_id: 2001,
        user_id: 3,
        created_at: undefined,
        info: undefined,
        score: undefined,
      }).exec();
      console.log(ret);
      expect(ret.affectedRows).to.equal(1);
    }
    {
      const ret = await model.findOne().where({ blog_id: 2001 }).exec();
      console.log(ret);
      expect(ret).to.include({
        blog_id: 2001,
        user_id: 3,
        score: 0,
      });
      expect(ret.info).to.deep.equal({});
    }
  });

});
