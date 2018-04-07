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
    expect(conn1._clusterId).to.equal("MASTER");
    expect(conn2._clusterId).to.equal("MASTER");
    expect(conn3._clusterId).to.equal("MASTER");
    conn1.release();
    conn2.release();
    conn3.release();
  }
  {
    const conn1 = (await conn.getSlaveConnection()) as any;
    const conn2 = (await conn.getSlaveConnection()) as any;
    const conn3 = (await conn.getSlaveConnection()) as any;
    const conn4 = (await conn.getSlaveConnection()) as any;
    expect(conn1._clusterId).to.be.oneOf(["SLAVE0", "SLAVE1"]);
    expect(conn2._clusterId).to.be.oneOf(["SLAVE0", "SLAVE1"]);
    expect(conn3._clusterId).to.be.oneOf(["SLAVE0", "SLAVE1"]);
    expect(conn4._clusterId).to.be.oneOf(["SLAVE0", "SLAVE1"]);
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
    expect(conn1._clusterId).to.be.oneOf(["MASTER", "SLAVE0", "SLAVE1"]);
    expect(conn2._clusterId).to.be.oneOf(["MASTER", "SLAVE0", "SLAVE1"]);
    expect(conn3._clusterId).to.be.oneOf(["MASTER", "SLAVE0", "SLAVE1"]);
    expect(conn4._clusterId).to.be.oneOf(["MASTER", "SLAVE0", "SLAVE1"]);
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
      const ret = await conn.query("select * from xxxxxxxxxxxxxxxxx");
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
    let eventIsEmitted = false;
    let emittedSql = "";
    conn.once("query", function(e) {
      utils.debug(e);
      eventIsEmitted = true;
      emittedSql = e.sql;
      expect(e.name).to.equal(`${connConfig.host}:${connConfig.port}`);
    });
    const ret = await conn.query("SHOW TABLES");
    utils.debug(ret, eventIsEmitted, emittedSql);
    expect(eventIsEmitted).to.equal(true);
    expect(emittedSql).to.equal("SHOW TABLES");
  }
  await conn.close();
});
