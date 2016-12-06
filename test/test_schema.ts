/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import chai = require("chai");
const orm = require("../");

const expect = chai.expect;

describe("Schema", function () {

  const schema = orm.createSchema({
    fields: {
      name: true,
      info: "json",
      data: {
        input(v) {
          return Buffer.from(v).toString("base64");
        },
        output(v) {
          return Buffer.from(v, "base64").toString();
        },
      },
      is_disabled: "bool",
      created_at: "date",
    },
  });

  it("serialize && unserialize", function () {
    const date = new Date();
    const data = schema.serialize({
      name: "ABC",
      info: {
        url: "http://baidu.com/",
        email: "me@ucdok.com",
      },
      data: "Hello, world",
      created_at: date,
    });
    console.log(data);
    expect(data).to.equal('{"name":"ABC","info":{"url":"http://baidu.com/","email":"me@ucdok.com"},"data":"Hello, world","created_at":"' + date.toISOString() + '"}');

    const ret = schema.unserialize(data);
    console.log(ret);
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

  it("formatInput & formatInputList", function () {
    expect(schema.formatInput({
      name: "ABC",
      OK: true,
    })).to.deep.equal({
      name: "ABC",
    });
    expect(schema.formatInput({
      name: "ABC",
      OK: true,
      info: "aaa",
    })).to.deep.equal({
      name: "ABC",
      info: '"aaa"',
    });
    expect(schema.formatInput({
      name: "ABC",
      info: "aaa",
      data: "hahaha",
    })).to.deep.equal({
      name: "ABC",
      info: '"aaa"',
      data: "aGFoYWhh",
    });
    expect(schema.formatInputList([{
      name: "ABC",
      info: "aaa",
      data: "hahaha",
    }, {
      name: "DDD",
      info: "aaa",
      data: "hahaha",
    }])).to.deep.equal([{
      name: "ABC",
      info: '"aaa"',
      data: "aGFoYWhh",
    }, {
      name: "DDD",
      info: '"aaa"',
      data: "aGFoYWhh",
    }]);
    // type bool
    expect(schema.formatInput({
      is_disabled: "off",
    })).to.deep.equal({
      is_disabled: 0,
    });
    expect(schema.formatInput({
      is_disabled: true,
    })).to.deep.equal({
      is_disabled: 1,
    });
    expect(schema.formatInput({
      is_disabled: 1,
    })).to.deep.equal({
      is_disabled: 1,
    });
  });

  it("formatOutput & formatOutputList", function () {
    expect(schema.formatOutput({
      name: "hello",
      data: "aGFoYWhh",
    })).to.deep.equal({
      name: "hello",
      data: "hahaha",
    });
    expect(schema.formatOutput({
      name: "hello",
      data: "aGFoYWhh",
      message: "yes",
    })).to.deep.equal({
      name: "hello",
      data: "hahaha",
      message: "yes",
    });
    expect(schema.formatOutput({
      name: "hello",
      data: "aGFoYWhh",
      message: "yes",
      info: '"aaa"',
    })).to.deep.equal({
      name: "hello",
      data: "hahaha",
      message: "yes",
      info: "aaa",
    });
    expect(schema.formatOutputList([{
      name: "hello",
      data: "aGFoYWhh",
      message: "yes",
    }, {
      name: "hello",
      data: "aGFoYWhh",
      message: "yes",
      info: '"aaa"',
    }])).to.deep.equal([{
      name: "hello",
      data: "hahaha",
      message: "yes",
    }, {
      name: "hello",
      data: "hahaha",
      message: "yes",
      info: "aaa",
    }]);
    // type bool
    expect(schema.formatOutput({
      is_disabled: 1,
    })).to.deep.equal({
      is_disabled: true,
    });
    expect(schema.formatOutput({
      is_disabled: 0,
    })).to.deep.equal({
      is_disabled: false,
    });
    expect(schema.formatOutput({
      is_disabled: null,
    })).to.deep.equal({
      is_disabled: false,
    });
    // 畸形json字段
    expect(schema.formatOutput({
      info: undefined,
    })).to.deep.equal({
      info: undefined,
    });
    expect(schema.formatOutput({
      info: null,
    })).to.deep.equal({
      info: {},
    });
    expect(schema.formatOutput({
      info: "",
    })).to.deep.equal({
      info: {},
    });
    expect(function () {
      schema.formatOutput({
        info: 123,
      });
    }).to.throw("jsonOutputFormatter: invalid input type: 123");
    expect(function () {
      schema.formatOutput({
        info: '{"a":',
      });
    }).to.throw("jsonOutputFormatter: fail to parse JSON");
  });

  it("not support type", function () {
    expect(function () {
      orm.createSchema({
        fields: {
          info: "xxxx",
        },
      });
    }).to.throw('not support type "xxxx"');
  });

});
