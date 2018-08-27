/**
 * @leizm/mysql tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import { expect } from "chai";
import * as mysql from "../lib";
import * as utils from "./utils";

test("escape() & escapeId()", async function() {
  const connConfig = utils.getConnectionConfig();
  const conn = new mysql.Connection({
    connections: [connConfig],
  });
  expect(conn.escape("hello")).to.equal("'hello'");
  expect(conn.escape("`hello`")).to.equal("'`hello`'");
  expect(conn.escapeId("hello")).to.equal("`hello`");
  expect(conn.escapeId("`hello`")).to.equal("```hello```");
  await conn.close();
});

test("Connection.getConnection() & getMasterConnection() & getSlaveConnection()", async function() {
  const connConfig = utils.getConnectionConfig();
  connConfig.connectionLimit = 5;
  const conn = new mysql.Connection({
    connections: [connConfig, connConfig, connConfig],
  });
  {
    const conn1 = (await conn.getMasterConnection()) as any;
    const conn2 = (await conn.getMasterConnection()) as any;
    const conn3 = (await conn.getMasterConnection()) as any;
    expect(conn1.connection._clusterId).to.equal("MASTER");
    expect(conn2.connection._clusterId).to.equal("MASTER");
    expect(conn3.connection._clusterId).to.equal("MASTER");
    conn1.release();
    conn2.release();
    conn3.release();
  }
  {
    const conn1 = (await conn.getSlaveConnection()) as any;
    const conn2 = (await conn.getSlaveConnection()) as any;
    const conn3 = (await conn.getSlaveConnection()) as any;
    const conn4 = (await conn.getSlaveConnection()) as any;
    expect(conn1.connection._clusterId).to.be.oneOf(["SLAVE0", "SLAVE1"]);
    expect(conn2.connection._clusterId).to.be.oneOf(["SLAVE0", "SLAVE1"]);
    expect(conn3.connection._clusterId).to.be.oneOf(["SLAVE0", "SLAVE1"]);
    expect(conn4.connection._clusterId).to.be.oneOf(["SLAVE0", "SLAVE1"]);
    conn1.release();
    conn2.release();
    conn3.release();
    conn4.release();
  }
  {
    const conn1 = (await conn.getConnection()) as any;
    const conn2 = (await conn.getConnection()) as any;
    const conn3 = (await conn.getConnection()) as any;
    const conn4 = (await conn.getConnection()) as any;
    expect(conn1.connection._clusterId).to.be.oneOf(["MASTER", "SLAVE0", "SLAVE1"]);
    expect(conn2.connection._clusterId).to.be.oneOf(["MASTER", "SLAVE0", "SLAVE1"]);
    expect(conn3.connection._clusterId).to.be.oneOf(["MASTER", "SLAVE0", "SLAVE1"]);
    expect(conn4.connection._clusterId).to.be.oneOf(["MASTER", "SLAVE0", "SLAVE1"]);
    conn1.release();
    conn2.release();
    conn3.release();
    conn4.release();
  }
  await conn.close();
});

test("query", async function() {
  const connConfig = utils.getConnectionConfig();
  const conn = new mysql.Connection({
    connections: [connConfig],
  });
  {
    const ret = await conn.query("SHOW TABLES");
    utils.debug(ret);
  }
  {
    try {
      const ret = await conn.querySlave("SHOW TABLES");
      utils.debug(ret);
      throw new Error("expected to throws 'Pool does not exist.' error");
    } catch (err) {
      expect(err.message).to.equal("Pool does not exist.");
    }
  }
  {
    const ret = await conn.queryMaster("SHOW TABLES");
    utils.debug(ret);
  }
  {
    try {
      await conn.query("select * from xxxxxxxxxxxxxxxxx");
    } catch (err) {
      utils.debug(err);
      expect(err).to.instanceof(Error);
      expect(err.code).to.equal("ER_NO_SUCH_TABLE");
      expect(err.sql).to.equal("select * from xxxxxxxxxxxxxxxxx");
    }
  }
  {
    const ret = await conn.query("DROP TABLE IF EXISTS `blog_contents`");
    utils.debug(ret);
  }
  {
    const sql = await utils.readTestFile("blog_contents.sql");
    const ret = await conn.query(sql);
    utils.debug(ret);
  }
  {
    const sql = conn.format("SELECT * FROM ::table WHERE id=:id", {
      table: "blog_contents",
      id: 2,
    });
    utils.debug(sql);
    const ret = await conn.query(sql);
    utils.debug(ret);
  }
  {
    const sql = conn.format("SELECT * FROM ?? WHERE id=?", ["blog_contents", 2]);
    utils.debug(sql);
    const ret = await conn.query(sql);
    utils.debug(ret);
  }
  {
    const c = await conn.getMasterConnection();
    utils.debug(c.escape(utils.newDate()));
    await c.beginTransaction();
    try {
      const ret = await c.query('INSERT INTO `blog_contents`(`id`,`content`) VALUES (1234, "456")');
      utils.debug(ret);
    } catch (err) {
      utils.debug(err);
      await c.rollback();
    }
    try {
      const ret = await c.query('INSERT INTO `blog_contents`(`id`,`content`) VALUES (1234, "9999")');
      utils.debug(ret);
    } catch (err) {
      utils.debug(err);
      await c.rollback();
    }
    try {
      await c.commit();
    } catch (err) {
      utils.debug(err);
      await c.rollback();
    }
    c.release();
  }
  {
    let queryEventIsEmitted = false;
    let resultEventIsEmitted = false;
    let emittedSql = "";
    conn.once("query", function(e) {
      utils.debug(e);
      queryEventIsEmitted = true;
      emittedSql = e.sql;
      expect(/\d+\.\d+/.test(e.id)).to.equal(true);
      expect(Date.now() - e.timestamp >= 0).to.equal(true);
      expect(e.name).to.equal(`${connConfig.host}:${connConfig.port}`);
    });
    conn.once("result", function(e) {
      utils.debug(e);
      resultEventIsEmitted = true;
      expect(e.sql).to.equal(emittedSql);
      expect(/\d+\.\d+/.test(e.id)).to.equal(true);
      expect(Date.now() - e.timestamp >= 0).to.equal(true);
      expect(e.name).to.equal(`${connConfig.host}:${connConfig.port}`);
      expect(e.spent >= 0).to.equal(true);
      expect(Array.isArray(e.data)).to.equal(true);
      expect(e.error).to.equal(null);
    });
    const ret = await conn.query("SHOW TABLES");
    utils.debug(ret, queryEventIsEmitted, emittedSql);
    expect(queryEventIsEmitted).to.equal(true);
    expect(resultEventIsEmitted).to.equal(true);
    expect(emittedSql).to.equal("SHOW TABLES");
  }
  await conn.close();
});

test("Connection.getConnection() cocurrent", async function() {
  const connConfig = utils.getConnectionConfig();
  connConfig.connectionLimit = 2;
  const conn = new mysql.Connection({
    connections: [connConfig],
  });
  {
    const list: Promise<any>[] = [];
    for (let i = 0; i < 100; i++) {
      list.push(conn.query(`SELECT ${i}`));
    }
    const ret = await Promise.all(list);
    for (let i = 0; i < 100; i++) {
      expect(ret[i]).to.deep.equal([{ [i]: i }]);
    }
  }
  {
    const list: Promise<any>[] = [];
    const gen = (i: number) =>
      new Promise((resolve, reject) => {
        conn
          .getConnection()
          .then(async c => {
            try {
              const r1 = await c.query(`SELECT ${i}`);
              const r22 = await c.query("INSERT INTO `blog_contents`(`id`,`content`) VALUES (10000" + i + ', "123")');
              expect(r22.insertId).to.greaterThan(0);
              const r2 = await c.query(`SELECT ${i}`);
              const r3 = await c.query(`SELECT ${i}`);
              const r33 = await c.query("INSERT INTO `blog_contents`(`id`,`content`) VALUES (20000" + i + ', "123")');
              expect(r33.insertId).to.greaterThan(0);
              expect(r1).to.deep.equal(r2);
              expect(r2).to.deep.equal(r3);
              resolve(r1);
            } catch (err) {
              reject(err);
            } finally {
              c.release();
            }
          })
          .catch(reject);
      });
    for (let i = 0; i < 100; i++) {
      list.push(gen(i));
    }
    const ret = await Promise.all(list);
    for (let i = 0; i < 100; i++) {
      expect(ret[i]).to.deep.equal([{ [i]: i }]);
    }
  }
  await conn.close();
});

test("Connection.getConnection() close by server side", async function() {
  const connConfig = utils.getConnectionConfig();
  connConfig.connectionLimit = 1;
  const conn = new mysql.Connection({
    connections: [connConfig],
  });
  {
    const c = await conn.getConnection();
    await c.query("SET wait_timeout=2");
    await c.query("SET interactive_timeout=2");
    const list = await c.query("SELECT * FROM `blog_contents`");
    // console.log(list.length);
    expect(list.length).to.greaterThan(0);
    c.release();
  }
  await utils.sleep(4000);
  {
    const c = await conn.getConnection();
    const list = await c.query("SELECT * FROM `blog_contents`");
    // console.log(list.length);
    expect(list.length).to.greaterThan(0);
    c.release();
  }
  await conn.close();
});
