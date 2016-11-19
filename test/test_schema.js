'use strict';

/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const expect = require('chai').expect;
const { createSchema } = require('../');


describe('Schema', function () {

  const query = createSchema({
    fields: {
      name: true,
      info: { type: 'json' },
      data: {
        encode(v) {
          return Buffer.from(v).toString('base64');
        },
        decode(v) {
          return Buffer.from(v, 'base64').toString();
        },
      },
    },
  });

  it('serialize && unserialize', function () {
    const data = query.serialize({
      name: 'ABC',
      info: {
        url: 'http://baidu.com/',
        email: 'me@ucdok.com',
      },
      data: 'Hello, world',
    });
    console.log(data);
    expect(data).to.equal('{"name":"ABC","info":{"url":"http://baidu.com/","email":"me@ucdok.com"},"data":"Hello, world"}');

    const ret = query.unserialize(data);
    console.log(ret);
    expect(ret).to.deep.equal({
      name: 'ABC',
      info: {
        url: 'http://baidu.com/',
        email: 'me@ucdok.com',
      },
      data: 'Hello, world',
    });
  });

  it('formatInput & formatInputList', function () {
    expect(query.formatInput({
      name: 'ABC',
      OK: true,
    })).to.deep.equal({
      name: 'ABC',
    });
    expect(query.formatInput({
      name: 'ABC',
      OK: true,
      info: 'aaa',
    })).to.deep.equal({
      name: 'ABC',
      info: '"aaa"',
    });
    expect(query.formatInput({
      name: 'ABC',
      info: 'aaa',
      data: 'hahaha',
    })).to.deep.equal({
      name: 'ABC',
      info: '"aaa"',
      data: 'aGFoYWhh',
    });
    expect(query.formatInputList([{
      name: 'ABC',
      info: 'aaa',
      data: 'hahaha',
    }, {
      name: 'DDD',
      info: 'aaa',
      data: 'hahaha',
    }])).to.deep.equal([{
      name: 'ABC',
      info: '"aaa"',
      data: 'aGFoYWhh',
    }, {
      name: 'DDD',
      info: '"aaa"',
      data: 'aGFoYWhh',
    }]);
  });

  it('formatOutput & formatOutputList', function () {
    expect(query.formatOutput({
      name: 'hello',
      data: 'aGFoYWhh',
    })).to.deep.equal({
      name: 'hello',
      data: 'hahaha',
    });
    expect(query.formatOutput({
      name: 'hello',
      data: 'aGFoYWhh',
      message: 'yes',
    })).to.deep.equal({
      name: 'hello',
      data: 'hahaha',
      message: 'yes',
    });
    expect(query.formatOutput({
      name: 'hello',
      data: 'aGFoYWhh',
      message: 'yes',
      info: '"aaa"',
    })).to.deep.equal({
      name: 'hello',
      data: 'hahaha',
      message: 'yes',
      info: 'aaa',
    });
    expect(query.formatOutputList([{
      name: 'hello',
      data: 'aGFoYWhh',
      message: 'yes',
    }, {
      name: 'hello',
      data: 'aGFoYWhh',
      message: 'yes',
      info: '"aaa"',
    }])).to.deep.equal([{
      name: 'hello',
      data: 'hahaha',
      message: 'yes',
    }, {
      name: 'hello',
      data: 'hahaha',
      message: 'yes',
      info: 'aaa',
    }]);
    // 畸形json字段
    expect(query.formatOutput({
      info: undefined,
    })).to.deep.equal({
      info: undefined,
    });
    expect(query.formatOutput({
      info: null,
    })).to.deep.equal({
      info: {},
    });
    expect(query.formatOutput({
      info: '',
    })).to.deep.equal({
      info: {},
    });
    expect(function () {
      query.formatOutput({
        info: 123,
      });
    }).to.throw('jsonDecoder: invalid input type: 123');
    expect(function () {
      query.formatOutput({
        info: '{"a":',
      });
    }).to.throw('jsonDecoder: fail to parse JSON');
  });

  it('not support type', function () {
    expect(function () {
      createSchema({
        fields: {
          info: { type: 'xxxx' },
        },
      });
    }).to.throw('not support type "xxxx"');
  });

});
