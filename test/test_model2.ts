/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import chai = require("chai");
import orm = require("../");
import utils = require("./utils");

const expect = chai.expect;

describe("Model - get|update|delete by primary and cache", function () {

  const prefix = utils.randomString(10) + ":";
  const cache = orm.createCache(utils.getCacheConfig({ prefix }));
  const connection = orm.createConnection({ connections: [ utils.getConnectionConfig() ]});
  const User = orm.createModel({
    cache, connection,
    table: "users",
    primary: "id",
    autoIncrement: true,
    fields: {
      id: true,
      name: true,
      email: true,
      info: "json",
      created_at: "date",
      score: true,
    },
  });
  const Friend = orm.createModel({
    cache, connection,
    table: "friends",
    primary: [ "user_id", "friend_id" ],
    fields: {
      user_id: true,
      friend_id: true,
      created_at: "date",
      remark: true,
    },
  });

  before(async function () {
    {
      const sql = await utils.readTestFile("users.sql");
      await connection.query("DROP TABLE IF EXISTS `users`");
      await connection.query(sql);
    }
    {
      const sql = await utils.readTestFile("friends.sql");
      await connection.query("DROP TABLE IF EXISTS `friends`");
      await connection.query(sql);
    }
  });

  after(async function () {
    await connection.close();
    await cache.close();
  });

  it("insert data", async function () {
    {
      const ret = await User.insert([{
        name: "张三",
        email: "zhangsan@ucdok.com",
        info: { age: 20 },
        created_at: utils.newDate(),
        score: 0,
        otherField: "test",
      }, {
        name: "李四",
        email: "lisi@ucdok.com",
        info: { },
        created_at: utils.newDate(),
        score: 0,
        otherField: "test",
      }, {
        name: "王五",
        email: "wangwu@ucdok.com",
        info: { age: 18, gender: "male" },
        created_at: utils.newDate(),
        score: 0,
        otherField: "test",
      }]).exec();
      console.log(ret);
    }
    {
      const ret = await Friend.insert([{
        user_id: 1,
        friend_id: 2,
        created_at: utils.newDate(),
        remark: "阿四",
        otherField: "test",
      }, {
        user_id: 1,
        friend_id: 3,
        created_at: utils.newDate(),
        remark: "阿五",
        otherField: "test",
      }, {
        user_id: 2,
        friend_id: 1,
        created_at: utils.newDate(),
        remark: "小三",
        otherField: "test",
      }, {
        user_id: 3,
        friend_id: 1,
        created_at: utils.newDate(),
        remark: "阿三",
        otherField: "test",
      }]).exec();
      console.log(ret);
    }
  });

  it("getByPrimary", async function () {
    {
      const ret = await User.getByPrimary({ id: 1, otherField: "test" });
      console.log(ret);
      expect(ret).to.include({
        name: "张三",
        email: "zhangsan@ucdok.com",
      });
    }
    {
      const ret = await Friend.getByPrimary({ user_id: 1, friend_id: 2, otherField: "test" });
      console.log(ret);
      expect(ret).to.include({
        user_id: 1,
        friend_id: 2,
        remark: "阿四",
      });
    }
  });

  it("updateByPrimary", async function () {
    {
      const ret = await User.updateByPrimary({ id: 1 }, { name: "张三丰", otherField: "test" });
      console.log(ret);
      expect(ret).to.include({
        id: 1,
        name: "张三",
      });
    }
    {
      const ret = await User.getByPrimary({ id: 1 });
      console.log(ret);
      expect(ret).to.include({
        name: "张三丰",
        email: "zhangsan@ucdok.com",
      });
    }
    {
      const ret = await Friend.updateByPrimary({
        user_id: 1,
        friend_id: 2,
        otherField: "test",
      }, {
        remark: "小四",
        otherField: "test",
      });
      console.log(ret);
      expect(ret).to.include({
        user_id: 1,
        friend_id: 2,
        remark: "阿四",
      });
    }
    {
      const ret = await Friend.getByPrimary({
        user_id: 1,
        friend_id: 2,
        otherField: "test",
      });
      console.log(ret);
      expect(ret).to.include({
        user_id: 1,
        friend_id: 2,
        remark: "小四",
      });
    }
  });

  it("deleteByPrimary", async function () {
    {
      const ret = await User.deleteByPrimary({ id: 1, otherField: "test" });
      console.log(ret);
      expect(ret).to.include({
        id: 1,
        name: "张三丰",
      });
    }
    {
      const ret = await User.getByPrimary({ id: 1, otherField: "test" });
      console.log(ret);
      expect(ret).to.be.undefined;
    }
    {
      const ret = await Friend.deleteByPrimary({
        user_id: 1,
        friend_id: 2,
        otherField: "test",
      });
      console.log(ret);
      expect(ret).to.include({
        user_id: 1,
        friend_id: 2,
      });
    }
    {
      const ret = await Friend.getByPrimary({
        user_id: 1,
        friend_id: 2,
        otherField: "test",
      });
      console.log(ret);
      expect(ret).to.be.undefined;
    }
  });

  it("finish", async function () {
    {
      const list = await User.find().exec();
      console.log(list);
      expect(list).to.have.lengthOf(2);
    }
    {
      const list = await Friend.find().exec();
      console.log(list);
      expect(list).to.have.lengthOf(3);
    }
  });

});
