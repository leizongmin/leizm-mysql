/**
 * @leizm/mysql tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import { expect } from "chai";
import * as orm from "../lib";
import * as utils from "./utils";

describe("Manager", function() {
  const prefix = utils.randomString(10) + ":";
  const manager = orm.createManager(
    utils.getCacheConfig({
      connections: [utils.getConnectionConfig()],
      prefix
    })
  );
  console.log(manager);

  before(async function() {
    const sql = await utils.readTestFile("admins.sql");
    await manager.connection.query("DROP TABLE IF EXISTS `admins`");
    await manager.connection.query(sql);
  });

  after(async function() {
    await manager.close();
  });

  it("registerModel", async function() {
    await 0;
    manager.registerModel("Admin", {
      table: "admins",
      primary: "id",
      autoIncrement: true,
      fields: {
        id: true,
        name: true,
        email: true,
        info: "json",
        created_at: "date"
      }
    });
  });

  it("hasModel", async function() {
    await 0;
    expect(manager.hasModel("Admin")).to.be.true;
    expect(manager.hasModel("admin")).to.be.false;
    expect(manager.hasModel("friend")).to.be.false;
  });

  it("model", async function() {
    {
      const ret = await manager
        .model("Admin")
        .insert({
          name: "超级管理员",
          email: "admin@ucdok.com",
          info: { role: "admin" },
          created_at: utils.newDate()
        })
        .exec();
      console.log(ret);
      expect(ret.affectedRows).to.equal(1);
      expect(ret.insertId).to.equal(1);
    }
    {
      const ret = await manager.model("Admin").getByPrimary({ id: 1 });
      console.log(ret);
      expect(ret).to.include({
        id: 1,
        name: "超级管理员",
        email: "admin@ucdok.com"
      });
    }
    {
      expect(function() {
        manager.model("Haha");
      }).to.throw('model "Haha" does not exists');
    }
  });
});
