'use strict';

/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const assert = require('assert');
const coroutine = require('lei-coroutine');
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
    assert.equal(data, '{"name":"ABC","info":{"url":"http://baidu.com/","email":"me@ucdok.com"},"data":"Hello, world"}');

    const ret = query.unserialize(data);
    console.log(ret);
    assert.deepEqual(ret, {
      name: 'ABC',
      info: {
        url: 'http://baidu.com/',
        email: 'me@ucdok.com',
      },
      data: 'Hello, world',
    });
  });

  it('formatInput & formatInputList', function () {
    assert.deepEqual(query.formatInput({
      name: 'ABC',
      OK: true,
    }), {
      name: 'ABC',
    });
    assert.deepEqual(query.formatInput({
      name: 'ABC',
      OK: true,
      info: 'aaa',
    }), {
      name: 'ABC',
      info: '"aaa"',
    });
    assert.deepEqual(query.formatInput({
      name: 'ABC',
      info: 'aaa',
      data: 'hahaha',
    }), {
      name: 'ABC',
      info: '"aaa"',
      data: 'aGFoYWhh',
    });
    assert.deepEqual(query.formatInputList([{
      name: 'ABC',
      info: 'aaa',
      data: 'hahaha',
    }, {
      name: 'DDD',
      info: 'aaa',
      data: 'hahaha',
    }]), [{
      name: 'ABC',
      info: '"aaa"',
      data: 'aGFoYWhh',
    }, {
      name: 'DDD',
      info: '"aaa"',
      data: 'aGFoYWhh',
    }]);
  });

});
