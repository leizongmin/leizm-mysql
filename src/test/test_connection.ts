/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import { expect } from "chai";
import * as orm from "../lib";
import * as utils from "./utils";

describe("Connection", function() {
  it("getConnection() support promise", async function() {
    const connConfig = utils.getConnectionConfig();
    const conn = orm.createConnection({
      connections: [connConfig]
    });
    // {
    //   const ret = await conn.query('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data`');
    //   console.log(ret);
    // }
    {
      const ret = await conn.query("DROP TABLE IF EXISTS `blog_contents`");
      console.log(ret);
    }
    {
      const sql = await utils.readTestFile("blog_contents.sql");
      const ret = await conn.query(sql);
      console.log(ret);
    }
    {
      const sql = conn.format("SELECT * FROM ::table WHERE id=:id", {
        table: "blog_contents",
        id: 2
      });
      console.log(sql);
      const ret = await conn.query(sql);
      console.log(ret);
    }
    {
      const sql = conn.format("SELECT * FROM ?? WHERE id=?", [
        "blog_contents",
        2
      ]);
      console.log(sql);
      const ret = await conn.query(sql);
      console.log(ret);
    }
    {
      const c = await conn.getMasterConnection();
      console.log(c.escape(utils.newDate()));
      await c.beginTransaction();
      try {
        const ret = await c.query(
          'INSERT INTO `blog_contents`(`id`,`content`) VALUES (1234, "456")'
        );
        console.log(ret);
      } catch (err) {
        console.log(err);
        await c.rollback();
      }
      try {
        const ret = await c.query(
          'INSERT INTO `blog_contents`(`id`,`content`) VALUES (1234, "9999")'
        );
        console.log(ret);
      } catch (err) {
        console.log(err);
        await c.rollback();
      }
      try {
        await c.commit();
      } catch (err) {
        console.log(err);
        await c.rollback();
      }
      c.release();
    }
    {
      let eventIsEmitted = false;
      let emittedSql = "";
      conn.once("query", function(e: { sql: string; name: string }) {
        console.log(e);
        eventIsEmitted = true;
        emittedSql = e.sql;
        expect(e.name).to.equal(`${connConfig.host}:${connConfig.port}`);
      });
      const ret = await conn.query("SHOW TABLES");
      console.log(ret, eventIsEmitted, emittedSql);
      expect(eventIsEmitted).to.equal(true);
      expect(emittedSql).to.equal("SHOW TABLES");
    }
    await conn.close();
  });
});
