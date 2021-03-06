/**
 * @leizm/mysql tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import { expect } from "chai";
import * as mysql from "../lib";
// import * as utils from "./utils";

const Q = mysql.QueryBuilder;

test("static method", function() {
  {
    const sql = mysql.QueryBuilder.select("a", "b")
      .from("hello")
      .where({ a: 1 })
      .build();
    expect(sql).to.equal("SELECT `a`, `b` FROM `hello` WHERE `a`=1");
  }
  {
    const sql = Q.select()
      .fields("a", "b")
      .table("hello")
      .where({ a: 1 })
      .build();
    expect(sql).to.equal("SELECT `a`, `b` FROM `hello` WHERE `a`=1");
  }
  {
    const sql = Q.insert({ a: 123, b: 456 })
      .into("hello")
      .build();
    expect(sql).to.equal("INSERT INTO `hello` (`a`, `b`) VALUES (123, 456)");
  }
  {
    const sql = Q.insert([{ a: 123, b: 456 }, { a: 789, b: 111 }])
      .into("hello")
      .build();
    expect(sql).to.equal("INSERT INTO `hello` (`a`, `b`) VALUES (123, 456),\n(789, 111)");
  }
  {
    const sql = Q.update()
      .table("abc")
      .set({ a: 123, b: 456 })
      .where({ c: 789 })
      .build();
    expect(sql).to.equal("UPDATE `abc` SET `a`=123, `b`=456 WHERE `c`=789");
  }
  {
    const sql = Q.delete()
      .from("abc")
      .where({ a: 666 })
      .limit(10)
      .build();
    expect(sql).to.equal("DELETE FROM `abc` WHERE `a`=666 LIMIT 10");
  }
});

test("leftJoin", function() {
  {
    const sql = Q.select()
      .from("hello")
      .as("A")
      .leftJoin("world")
      .as("B")
      .on("A.id=B.id")
      .where("1")
      .and("2")
      .skip(2)
      .limit(3)
      .build();
    expect(sql).to.equal(
      "SELECT `A`.*, `B`.* FROM `hello` AS `A` LEFT JOIN `world` AS `B` ON A.id=B.id WHERE 1 AND 2 LIMIT 2,3",
    );
  }
  {
    const sql = Q.select("x", "y")
      .from("hello")
      .as("A")
      .leftJoin("world", ["z"])
      .as("B")
      .on("A.id=B.id")
      .where("1")
      .and("2")
      .skip(2)
      .limit(3)
      .build();
    expect(sql).to.equal(
      "SELECT `A`.`x`, `A`.`y`, `B`.`z` FROM `hello` AS `A` LEFT JOIN `world` AS `B` ON A.id=B.id WHERE 1 AND 2 LIMIT 2,3",
    );
  }
  {
    const sql = Q.select("x", "y")
      .from("hello")
      .leftJoin("world", ["z"])
      .on("hello.id=world.id")
      .where("1")
      .and("2")
      .skip(2)
      .limit(3)
      .build();
    expect(sql).to.equal(
      "SELECT `hello`.`x`, `hello`.`y`, `world`.`z` FROM `hello` LEFT JOIN `world` ON hello.id=world.id WHERE 1 AND 2 LIMIT 2,3",
    );
  }
});

test("rightJoin", function() {
  {
    const sql = Q.select()
      .from("hello")
      .as("A")
      .rightJoin("world")
      .as("B")
      .on("A.id=B.id")
      .where("1")
      .and("2")
      .skip(2)
      .limit(3)
      .build();
    expect(sql).to.equal(
      "SELECT `A`.*, `B`.* FROM `hello` AS `A` RIGHT JOIN `world` AS `B` ON A.id=B.id WHERE 1 AND 2 LIMIT 2,3",
    );
  }
  {
    const sql = Q.select("x", "y")
      .from("hello")
      .as("A")
      .rightJoin("world", ["z"])
      .as("B")
      .on("A.id=B.id")
      .where("1")
      .and("2")
      .skip(2)
      .limit(3)
      .build();
    expect(sql).to.equal(
      "SELECT `A`.`x`, `A`.`y`, `B`.`z` FROM `hello` AS `A` RIGHT JOIN `world` AS `B` ON A.id=B.id WHERE 1 AND 2 LIMIT 2,3",
    );
  }
  {
    const sql = Q.select("x", "y")
      .from("hello")
      .rightJoin("world", ["z"])
      .on("hello.id=world.id")
      .where("1")
      .and("2")
      .skip(2)
      .limit(3)
      .build();
    expect(sql).to.equal(
      "SELECT `hello`.`x`, `hello`.`y`, `world`.`z` FROM `hello` RIGHT JOIN `world` ON hello.id=world.id WHERE 1 AND 2 LIMIT 2,3",
    );
  }
});

test("join", function() {
  {
    const sql = Q.select()
      .from("hello")
      .as("A")
      .join("world")
      .as("B")
      .on("A.id=B.id")
      .where("1")
      .and("2")
      .skip(2)
      .limit(3)
      .build();
    expect(sql).to.equal(
      "SELECT `A`.*, `B`.* FROM `hello` AS `A` JOIN `world` AS `B` ON A.id=B.id WHERE 1 AND 2 LIMIT 2,3",
    );
  }
  {
    const sql = Q.select("x", "y")
      .from("hello")
      .as("A")
      .join("world", ["z"])
      .as("B")
      .on("A.id=B.id")
      .where("1")
      .and("2")
      .skip(2)
      .limit(3)
      .build();
    expect(sql).to.equal(
      "SELECT `A`.`x`, `A`.`y`, `B`.`z` FROM `hello` AS `A` JOIN `world` AS `B` ON A.id=B.id WHERE 1 AND 2 LIMIT 2,3",
    );
  }
  {
    const sql = Q.select("x", "y")
      .from("hello")
      .join("world", ["z"])
      .on("hello.id=world.id")
      .where("1")
      .and("2")
      .skip(2)
      .limit(3)
      .build();
    expect(sql).to.equal(
      "SELECT `hello`.`x`, `hello`.`y`, `world`.`z` FROM `hello` JOIN `world` ON hello.id=world.id WHERE 1 AND 2 LIMIT 2,3",
    );
  }
});
