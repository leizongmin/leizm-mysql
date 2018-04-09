/**
 * @leizm/mysql tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import { expect } from "chai";
import * as mysql from "../lib";
import * as utils from "./utils";

test("cache.saveList()", async function() {
  const cache = new mysql.Cache(utils.getCacheConfig());
  {
    const ret = await cache.saveList([
      {
        key: "aaaaa",
        data: "HaHa",
      },
      {
        key: "bb",
        data: "CCCCCCCCC",
      },
    ]);
    utils.debug(ret);

    // 检查TTL
    const p = cache.redis.multi();
    for (const k of ret) {
      p.ttl(k);
    }
    const ret2 = await p.exec();
    utils.debug(ret2);
    for (const item of ret2) {
      expect(item[0]).to.be.null;
      expect(item[1]).to.be.above(0);
    }
  }
  await cache.close();
});

test("cache.saveItem()", async function() {
  const cache = new mysql.Cache(utils.getCacheConfig());
  const list = [
    {
      key: "aaaaa",
      data: "HaHa",
    },
    {
      key: "bb",
      data: "CCCCCCCCC",
    },
  ];
  const ret: any[] = [];
  for (const item of list) {
    console.log(item);
    ret.push(
      await cache.saveItem({
        key: "aaaaa",
        data: "HaHa",
      }),
    );
  }
  // 检查TTL
  const p = cache.redis.multi();
  for (const k of ret) {
    p.ttl(k);
  }
  const ret2 = await p.exec();
  utils.debug(ret2);
  for (const item of ret2) {
    expect(item[0]).to.be.null;
    expect(item[1]).to.be.above(0);
  }
  await cache.close();
});

test("cache.getList() & cache.removeList() & cache.removeItem()", async function() {
  const cache = new mysql.Cache(utils.getCacheConfig());
  {
    const ret = await cache.saveList([
      {
        key: "test1",
        data: "data1",
      },
      {
        key: "test2",
        data: "data2",
      },
    ]);
    utils.debug(ret);
  }
  {
    const ret = await cache.getList(["test0", "test1", "test2", "test3"]);
    utils.debug(ret);
    expect(ret).to.deep.equal([null, "data1", "data2", null]);
  }
  {
    const ret = await cache.removeList(["test0", "test1"]);
    utils.debug(ret);
  }
  {
    const ret = await cache.getList(["test0", "test1", "test2", "test3"]);
    utils.debug(ret);
    expect(ret).to.deep.equal([null, null, "data2", null]);
  }
  {
    const ret = await cache.removeItem("test2");
    utils.debug(ret);
  }
  {
    const ret = await cache.getList(["test0", "test1", "test2", "test3"]);
    utils.debug(ret);
    expect(ret).to.deep.equal([null, null, null, null]);
  }
  await cache.close();
});

test("empty", async function() {
  const cache = new mysql.Cache(utils.getCacheConfig());
  {
    const ret = await cache.saveList([]);
    expect(ret).to.deep.equal([]);
  }
  {
    const ret = await cache.getList([]);
    expect(ret).to.deep.equal([]);
  }
  {
    const ret = await cache.removeList([]);
    expect(ret).to.deep.equal([]);
  }
  await cache.close();
});
