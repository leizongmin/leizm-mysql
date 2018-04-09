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
const User = new mysql.Table({
  cache,
  connection,
  table: "users4",
  primary: "id",
  uniques: ["phone", ["first_name", "last_name"]],
  autoIncrement: true,
  fields: {
    id: true,
    phone: true,
    first_name: true,
    last_name: true,
    info: "json",
  },
});
const UserBlog = new mysql.Table({
  cache,
  connection,
  table: "user_blogs4",
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
  {
    const sql = await utils.readTestFile("users4.sql");
    await connection.query("DROP TABLE IF EXISTS `users4`");
    await connection.query(sql);
  }
  {
    const sql = await utils.readTestFile("user_blogs4.sql");
    await connection.query("DROP TABLE IF EXISTS `user_blogs4`");
    await connection.query(sql);
  }
});

afterAll(async function() {
  await connection.close();
  await cache.close();
});

test("transaction - commit success", async function() {
  const c = await connection.getConnection();
  await c.beginTransaction();
  const [user] = await User.bindConnection(c).insert({
    phone: "13800138000",
    first_name: "L",
    last_name: "Ei",
    info: { age: 18 },
  });
  // console.log(user);
  const [blog] = await UserBlog.bindConnection(c).insert({ blog_id: 1, user_id: user.id, score: 111 });
  // console.log(blog);
  await c.commit();
  c.release();
  const u = await User.findOne()
    .where({ id: user.id })
    .exec();
  const b = await UserBlog.findOne()
    .where({ blog_id: 1, user_id: user.id })
    .exec();
  expect(u).to.deep.equal(user);
  expect(b).to.deep.equal(blog);
});

test("transaction - rollback success", async function() {
  const c = await connection.getConnection();
  await c.beginTransaction();
  const [user] = await User.bindConnection(c).insert({
    phone: "13800138001",
    first_name: "X",
    last_name: "Y",
    info: { age: 18 },
  });
  // console.log(user);
  const [blog] = await UserBlog.bindConnection(c).insert({ blog_id: 1, user_id: user.id, score: 111 });
  // console.log(blog);
  await c.rollback();
  c.release();
  const u = await User.findOne()
    .where({ id: user.id })
    .exec();
  const b = await UserBlog.findOne()
    .where({ blog_id: 1, user_id: user.id })
    .exec();
  expect(u).to.equal(undefined);
  expect(b).to.equal(undefined);
});
