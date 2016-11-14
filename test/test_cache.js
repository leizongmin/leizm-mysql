'use strict';

/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const assert = require('assert');
const coroutine = require('lei-coroutine');
const { createCache } = require('../');
const { getCacheConfig } = require('./utils');


describe('Cache', function () {

  it('cache.saveList()', coroutine.wrap(function* () {

    const cache = createCache(getCacheConfig());
    {
      const ret = yield cache.saveList([{
        key: 'aaaaa',
        data: 'HaHa',
      }, {
        key: 'bb',
        data: 'CCCCCCCCC',
      }]);
      console.log(ret);

      // 检查TTL
      const p = cache._redis.multi();
      for (const k of ret) {
        p.ttl(k);
      }
      const ret2 = yield p.exec();
      console.log(ret2);
      for (const item of ret2) {
        assert.equal(item[0], null);
        assert.ok(item[1] > 0);
      }
    }

    yield cache.close();

  }));

  it('cache.getList() & cache.removeList()', coroutine.wrap(function* () {

    const cache = createCache(getCacheConfig());
    {
      const ret = yield cache.saveList([{
        key: 'test1',
        data: 'data1',
      }, {
        key: 'test2',
        data: 'data2',
      }]);
      console.log(ret);
    }
    {
      const ret = yield cache.getList([ 'test0', 'test1', 'test2', 'test3' ]);
      console.log(ret);
      assert.deepEqual(ret, [ null, 'data1', 'data2', null ]);
    }
    {
      const ret = yield cache.removeList([ 'test0', 'test1' ]);
      console.log(ret);
    }
    {
      const ret = yield cache.getList([ 'test0', 'test1', 'test2', 'test3' ]);
      console.log(ret);
      assert.deepEqual(ret, [ null, null, 'data2', null ]);
    }
    yield cache.close();

  }));

});
