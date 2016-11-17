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
  });

});
