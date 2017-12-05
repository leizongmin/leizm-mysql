/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import chai = require('chai');
import orm = require('../lib');
import utils = require('./utils');

const expect = chai.expect;

describe('Cache', function () {

  it('cache.saveList()', async function () {
    const cache = orm.createCache(utils.getCacheConfig());
    {
      const ret = await cache.saveList([{
        key: 'aaaaa',
        data: 'HaHa',
      }, {
        key: 'bb',
        data: 'CCCCCCCCC',
      }]);
      console.log(ret);

      // 检查TTL
      const p = cache.redis.multi();
      for (const k of ret) {
        p.ttl(k);
      }
      const ret2 = await p.exec();
      console.log(ret2);
      for (const item of ret2) {
        expect(item[0]).to.be.null;
        expect(item[1]).to.be.above(0);
      }
    }
    await cache.close();
  });

  it('cache.getList() & cache.removeList()', async function () {
    const cache = orm.createCache(utils.getCacheConfig());
    {
      const ret = await cache.saveList([{
        key: 'test1',
        data: 'data1',
      }, {
        key: 'test2',
        data: 'data2',
      }]);
      console.log(ret);
    }
    {
      const ret = await cache.getList([ 'test0', 'test1', 'test2', 'test3' ]);
      console.log(ret);
      expect(ret).to.deep.equal([ null, 'data1', 'data2', null ]);
    }
    {
      const ret = await cache.removeList([ 'test0', 'test1' ]);
      console.log(ret);
    }
    {
      const ret = await cache.getList([ 'test0', 'test1', 'test2', 'test3' ]);
      console.log(ret);
      expect(ret).to.deep.equal([ null, null, 'data2', null ]);
    }
    await cache.close();
  });

});
