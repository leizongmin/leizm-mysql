/**
 * @leizm/mysql tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import { expect } from "chai";
import * as mysql from "../lib";
import * as utils from "./utils";

const schema = new mysql.Schema({
  fields: {
    name: true,
    info: "json",
    data: {
      input(v: any) {
        return Buffer.from(v).toString("base64");
      },
      output(v: any) {
        return Buffer.from(v, "base64").toString();
      },
    },
    is_disabled: "bool",
    created_at: "date",
  },
});

test("serialize && unserialize", function() {
  const date = utils.newDate();
  const data = schema.serialize({
    name: "ABC",
    info: {
      url: "http://baidu.com/",
      email: "me@ucdok.com",
    },
    data: "Hello, world",
    created_at: date,
  });
  utils.debug(data);
  expect(data).to.equal(
    '{"name":"ABC","info":{"url":"http://baidu.com/","email":"me@ucdok.com"},"data":"Hello, world","created_at":"' +
      date.toISOString() +
      '"}',
  );

  const ret = schema.unserialize(data);
  utils.debug(ret);
  expect(ret).to.deep.equal({
    name: "ABC",
    info: {
      url: "http://baidu.com/",
      email: "me@ucdok.com",
    },
    data: "Hello, world",
    created_at: date,
  });
});

test("formatInput & formatInputList", function() {
  expect(
    schema.formatInput({
      name: "ABC",
      OK: true,
    }),
  ).to.deep.equal({
    name: "ABC",
  });
  expect(
    schema.formatInput({
      name: "ABC",
      OK: true,
      info: "aaa",
    }),
  ).to.deep.equal({
    name: "ABC",
    info: '"aaa"',
  });
  expect(
    schema.formatInput({
      name: "ABC",
      info: "aaa",
      data: "hahaha",
    }),
  ).to.deep.equal({
    name: "ABC",
    info: '"aaa"',
    data: "aGFoYWhh",
  });
  expect(
    schema.formatInputList([
      {
        name: "ABC",
        info: "aaa",
        data: "hahaha",
      },
      {
        name: "DDD",
        info: "aaa",
        data: "hahaha",
      },
    ]),
  ).to.deep.equal([
    {
      name: "ABC",
      info: '"aaa"',
      data: "aGFoYWhh",
    },
    {
      name: "DDD",
      info: '"aaa"',
      data: "aGFoYWhh",
    },
  ]);
  // type bool
  expect(
    schema.formatInput({
      is_disabled: "off",
    }),
  ).to.deep.equal({
    is_disabled: 0,
  });
  expect(
    schema.formatInput({
      is_disabled: true,
    }),
  ).to.deep.equal({
    is_disabled: 1,
  });
  expect(
    schema.formatInput({
      is_disabled: 1,
    }),
  ).to.deep.equal({
    is_disabled: 1,
  });
});

test("formatOutput & formatOutputList", function() {
  expect(
    schema.formatOutput({
      name: "hello",
      data: "aGFoYWhh",
    }),
  ).to.deep.equal({
    name: "hello",
    data: "hahaha",
  });
  expect(
    schema.formatOutput({
      name: "hello",
      data: "aGFoYWhh",
      message: "yes",
    }),
  ).to.deep.equal({
    name: "hello",
    data: "hahaha",
    message: "yes",
  });
  expect(
    schema.formatOutput({
      name: "hello",
      data: "aGFoYWhh",
      message: "yes",
      info: '"aaa"',
    }),
  ).to.deep.equal({
    name: "hello",
    data: "hahaha",
    message: "yes",
    info: "aaa",
  });
  expect(
    schema.formatOutputList([
      {
        name: "hello",
        data: "aGFoYWhh",
        message: "yes",
      },
      {
        name: "hello",
        data: "aGFoYWhh",
        message: "yes",
        info: '"aaa"',
      },
    ]),
  ).to.deep.equal([
    {
      name: "hello",
      data: "hahaha",
      message: "yes",
    },
    {
      name: "hello",
      data: "hahaha",
      message: "yes",
      info: "aaa",
    },
  ]);
  // type bool
  expect(
    schema.formatOutput({
      is_disabled: 1,
    }),
  ).to.deep.equal({
    is_disabled: true,
  });
  expect(
    schema.formatOutput({
      is_disabled: 0,
    }),
  ).to.deep.equal({
    is_disabled: false,
  });
  expect(
    schema.formatOutput({
      is_disabled: null,
    }),
  ).to.deep.equal({
    is_disabled: false,
  });
  // 畸形json字段
  expect(
    schema.formatOutput({
      info: undefined,
    }),
  ).to.deep.equal({
    info: undefined,
  });
  expect(
    schema.formatOutput({
      info: null,
    }),
  ).to.deep.equal({
    info: null,
  });
  expect(
    schema.formatOutput({
      info: "",
    }),
  ).to.deep.equal({
    info: {},
  });
  expect(function() {
    schema.formatOutput({
      info: 123,
    });
  }).to.throw("jsonOutputFormatter: invalid input type: 123");
  expect(function() {
    schema.formatOutput({
      info: '{"a":',
    });
  }).to.throw("jsonOutputFormatter: fail to parse JSON");
});

test("not support type", function() {
  expect(function() {
    new mysql.Schema({
      fields: {
        info: "xxxx" as any,
      },
    });
  }).to.throw('not support type "xxxx"');
});
