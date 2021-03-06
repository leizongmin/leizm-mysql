/**
 * @leizm/mysql tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import { expect } from "chai";
import * as mysql from "../lib";
import * as utils from "./utils";

test("select", function() {
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query.select("name", "age").build();
    utils.debug(sql);
    expect(sql).to.equal("SELECT `name`, `age` FROM `test1`");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .select("name", "age")
      .where({
        a: 123,
        b: 456,
      })
      .build();
    utils.debug(sql);
    expect(sql).to.equal("SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .select("name", "age")
      .where("`a`=:a AND `b`=:b", {
        a: 123,
        b: 456,
      })
      .build();
    utils.debug(sql);
    expect(sql).to.equal("SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .select("name", "age")
      .where({
        a: 123,
      })
      .where({
        b: 456,
      })
      .build();
    utils.debug(sql);
    expect(sql).to.equal("SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .select("name", "age")
      .where("`a`=? AND `b`=?", [123, 456])
      .build();
    utils.debug(sql);
    expect(sql).to.equal("SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .select("name", "age")
      .where({
        a: 123,
        b: 456,
      })
      .limit(10)
      .build();
    utils.debug(sql);
    expect(sql).to.equal("SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 LIMIT 10");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .select("name", "age")
      .where({
        a: 123,
        b: 456,
      })
      .skip(10)
      .build();
    utils.debug(sql);
    expect(sql).to.equal("SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 LIMIT 10,18446744073709551615");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .select("name", "age")
      .where({
        a: 123,
        b: 456,
      })
      .skip(10)
      .limit(20)
      .build();
    utils.debug(sql);
    expect(sql).to.equal("SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 LIMIT 10,20");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .select("name", "age")
      .where({
        a: 123,
        b: 456,
      })
      .skip(10)
      .limit(20)
      .orderBy("`a` DESC, `b` ASC")
      .build();
    utils.debug(sql);
    expect(sql).to.equal(
      "SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 ORDER BY `a` DESC, `b` ASC LIMIT 10,20",
    );
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .select("name", "age")
      .where({
        a: 123,
        b: 456,
      })
      .skip(10)
      .limit(20)
      .orderBy("`a` ?, `b` ?", ["DESC", "ASC"])
      .build();
    utils.debug(sql);
    expect(sql).to.equal(
      "SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 ORDER BY `a` DESC, `b` ASC LIMIT 10,20",
    );
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .select("name", "age")
      .where({
        a: 123,
      })
      .and({
        b: 456,
      })
      .skip(10)
      .limit(20)
      .orderBy("`a` ?, `b` ?", ["DESC", "ASC"])
      .build();
    utils.debug(sql);
    expect(sql).to.equal(
      "SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 ORDER BY `a` DESC, `b` ASC LIMIT 10,20",
    );
  }
});
test("groupBy", function() {
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .select("name", "age")
      .where({
        a: 123,
      })
      .skip(10)
      .limit(20)
      .groupBy("`name`")
      .build();
    utils.debug(sql);
    expect(sql).to.equal("SELECT `name`, `age` FROM `test1` WHERE `a`=123 GROUP BY `name` LIMIT 10,20");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .select("name", "age")
      .where({
        a: 123,
      })
      .skip(10)
      .limit(20)
      .groupBy("`name` HAVING `b`=?", [22])
      .build();
    utils.debug(sql);
    expect(sql).to.equal("SELECT `name`, `age` FROM `test1` WHERE `a`=123 GROUP BY `name` HAVING `b`=22 LIMIT 10,20");
  }
});
test("count", function() {
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .count("c")
      .where({
        a: 456,
        b: 789,
      })
      .build();
    utils.debug(sql);
    expect(sql).to.equal("SELECT COUNT(*) AS `c` FROM `test1` WHERE `a`=456 AND `b`=789");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .count("c")
      .where({
        a: 456,
        b: 789,
      })
      .limit(1)
      .build();
    utils.debug(sql);
    expect(sql).to.equal("SELECT COUNT(*) AS `c` FROM `test1` WHERE `a`=456 AND `b`=789 LIMIT 1");
  }
});
test("insert", function() {
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .insert({
        a: 123,
        b: 456,
      })
      .build();
    utils.debug(sql);
    expect(sql).to.equal("INSERT INTO `test1` (`a`, `b`) VALUES (123, 456)");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .insert([
        {
          a: 123,
          b: 456,
        },
        {
          a: 789,
          b: 110,
        },
      ])
      .build();
    utils.debug(sql);
    expect(sql).to.equal("INSERT INTO `test1` (`a`, `b`) VALUES (123, 456),\n(789, 110)");
  }
});
test("update", function() {
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .update({
        a: 123,
        b: 456,
      })
      .build();
    utils.debug(sql);
    expect(sql).to.equal("UPDATE `test1` SET `a`=123, `b`=456");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .update({
        a: 123,
        b: 456,
      })
      .limit(12)
      .build();
    utils.debug(sql);
    expect(sql).to.equal("UPDATE `test1` SET `a`=123, `b`=456 LIMIT 12");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .update({
        a: 123,
        b: 456,
      })
      .where({
        b: 777,
      })
      .limit(12)
      .build();
    utils.debug(sql);
    expect(sql).to.equal("UPDATE `test1` SET `a`=123, `b`=456 WHERE `b`=777 LIMIT 12");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .update({
        a: 123,
      })
      .set({
        b: 456,
      })
      .where({
        b: 777,
      })
      .limit(12)
      .build();
    utils.debug(sql);
    expect(sql).to.equal("UPDATE `test1` SET `a`=123, `b`=456 WHERE `b`=777 LIMIT 12");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .update()
      .set({
        a: 123,
        b: 456,
      })
      .where({
        b: 777,
      })
      .limit(12)
      .build();
    utils.debug(sql);
    expect(sql).to.equal("UPDATE `test1` SET `a`=123, `b`=456 WHERE `b`=777 LIMIT 12");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    expect(() => {
      query.set({ a: 1 }).build();
    }).throw("query type must be UPDATE, please call .update() before");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    expect(() => {
      query.update().build();
    }).throw("update data connot be empty");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    expect(() => {
      query
        .update({})
        .where({
          a: 123,
        })
        .limit(456)
        .build();
    }).throw("update data connot be empty");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .update({})
      .set({ a: 456 })
      .where({
        a: 123,
      })
      .limit(456)
      .build();
    utils.debug(sql);
    expect(sql).to.equal("UPDATE `test1` SET `a`=456 WHERE `a`=123 LIMIT 456");
  }
});
test("delete", function() {
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query.delete().build();
    utils.debug(sql);
    expect(sql).to.equal("DELETE FROM `test1`");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .delete()
      .where("`a`=2")
      .build();
    utils.debug(sql);
    expect(sql).to.equal("DELETE FROM `test1` WHERE `a`=2");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .delete()
      .where("`a`=2")
      .limit(1)
      .build();
    utils.debug(sql);
    expect(sql).to.equal("DELETE FROM `test1` WHERE `a`=2 LIMIT 1");
  }
});
test("sql", function() {
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query.sql('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data`').build();
    utils.debug(sql);
    expect(sql).to.equal('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data`');
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .sql('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` :$limit')
      .limit(10)
      .build();
    utils.debug(sql);
    expect(sql).to.equal('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` LIMIT 10');
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .sql('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` :$limit')
      .limit(10)
      .skip(5)
      .build();
    utils.debug(sql);
    expect(sql).to.equal('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` LIMIT 5,10');
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .sql('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` :$orderBy :$limit')
      .limit(10)
      .skip(5)
      .orderBy("`id` ASC")
      .build();
    utils.debug(sql);
    expect(sql).to.equal(
      'SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` ORDER BY `id` ASC LIMIT 5,10',
    );
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .sql("SELECT :$fields FROM `test1`")
      .fields("a", "b", "c")
      .limit(10)
      .skip(5)
      .orderBy("`id` ASC")
      .build();
    utils.debug(sql);
    expect(sql).to.equal("SELECT `a`, `b`, `c` FROM `test1`");
  }
});

test("options", function() {
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .select()
      .options({
        skip: 1,
        limit: 2,
        orderBy: "`id` DESC",
        groupBy: "`name`",
        fields: ["id", "name"],
      })
      .build();
    utils.debug(sql);
    expect(sql).to.equal("SELECT `id`, `name` FROM `test1` GROUP BY `name` ORDER BY `id` DESC LIMIT 1,2");
  }
});

test("where(condition): condition for modify operation cannot be empty", function() {
  // SELECT 操作可以为空
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .select("name", "age")
      .where({})
      .build();
    utils.debug(sql);
    expect(sql).to.equal("SELECT `name`, `age` FROM `test1`");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .select("name", "age")
      .where("   ")
      .build();
    utils.debug(sql);
    expect(sql).to.equal("SELECT `name`, `age` FROM `test1`");
  }
  // 其他操作不能为空
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    expect(() => {
      const sql = query
        .update({ a: 123 })
        .where({})
        .build();
      utils.debug(sql);
    }).to.throw("condition for modify operation cannot be empty");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    expect(() => {
      const sql = query
        .delete()
        .where("   ")
        .build();
      utils.debug(sql);
    }).to.throw("condition for modify operation cannot be empty");
  }
});

test("where(condition): condition key cannot be undefined", function() {
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    expect(() => {
      const sql = query
        .update({ a: 123 })
        .where({ a: 123, b: undefined })
        .build();
      utils.debug(sql);
    }).to.throw("found undefined value for condition keys b; it may caused unexpected errors");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    expect(() => {
      const sql = query
        .select("name", "age")
        .where({ a: 123, b: 456, c: undefined, d: undefined })
        .build();
      utils.debug(sql);
    }).to.throw("found undefined value for condition keys c,d; it may caused unexpected errors");
  }
});

test("where(condition): support for $in & $like", function() {
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .select("name", "age")
      .where({
        a: { $in: [1, 2, 3] },
        b: { $like: "%hello%" },
      })
      .skip(10)
      .limit(20)
      .orderBy("`a` DESC, `b` ASC")
      .build();
    utils.debug(sql);
    expect(sql).to.equal(
      "SELECT `name`, `age` FROM `test1` WHERE `a` IN (1, 2, 3) AND `b` LIKE '%hello%' ORDER BY `a` DESC, `b` ASC LIMIT 10,20",
    );
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    expect(() => {
      const sql = query
        .update({ a: 123 })
        .where({ a: { $in: 123 } })
        .build();
      utils.debug(sql);
    }).to.throw("value for condition type $in in field a must be an array");
  }
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    expect(() => {
      const sql = query
        .update({ a: 123 })
        .where({ a: { $like: 123 } })
        .build();
      utils.debug(sql);
    }).to.throw("value for condition type $like in a must be a string");
  }
});

test("update(data): support for $incr", function() {
  {
    const query = new mysql.QueryBuilder({ table: "test1" });
    const sql = query
      .update({ a: { $incr: 1 } })
      .where({ a: 2 })
      .build();
    utils.debug(sql);
    expect(sql).to.equal("UPDATE `test1` SET `a`=`a`+1 WHERE `a`=2");
  }
});
