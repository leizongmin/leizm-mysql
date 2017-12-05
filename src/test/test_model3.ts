/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import chai = require('chai');
import orm = require('../lib');
import utils = require('./utils');

const expect = chai.expect;

describe('Model - get|update|delete by unique and cache', function () {

  const prefix = utils.randomString(10) + ':';
  const cache = orm.createCache(utils.getCacheConfig({ prefix }));
  const connection = orm.createConnection({ connections: [ utils.getConnectionConfig() ]});
  const User = orm.createModel({
    cache, connection,
    table: 'users2',
    primary: 'id',
    uniques: [
      'phone',
      [ 'first_name', 'last_name' ],
    ],
    autoIncrement: true,
    fields: {
      id: true,
      phone: true,
      first_name: true,
      last_name: true,
      info: 'json',
    },
  });

  before(async function () {
    const sql = await utils.readTestFile('users2.sql');
    await connection.query('DROP TABLE IF EXISTS `users2`');
    await connection.query(sql);
  });

  after(async function () {
    await connection.close();
    await cache.close();
  });

  it('insert initial data', async function () {
    const ret = await User.insert([{
      phone: '1230001',
      first_name: 'Zhang',
      last_name: 'San',
      info: { ChineseName: '张🍎三' },
    }, {
      phone: '1230002',
      first_name: 'Li',
      last_name: 'Si',
      info: { ChineseName: '😄李四' },
    }, {
      phone: '1230003',
      first_name: 'Wang',
      last_name: 'Wu',
      info: { ChineseName: '王🍌五' },
    }, {
      phone: '',
      first_name: 'zhao',
      last_name: 'Liu',
      info: { ChineseName: '赵✈️六' },
    }]).exec();
    console.log(ret);
    expect(ret.affectedRows).to.equal(4);
  });

  it('getByUnique', async function () {
    const data = {
      id: 2,
      phone: '1230002',
      first_name: 'Li',
      last_name: 'Si',
      info: { ChineseName: '李四' },
    };
    {
      const ret = await User.getByPrimary({
        id: 2,
      });
      console.log(ret);
      expect(ret).to.deep.equal(data);
    }
    {
      const ret = await User.getByUnique({
        phone: '1230002',
      });
      console.log(ret);
      expect(ret).to.deep.equal(data);
    }
    {
      const ret = await User.getByUnique({
        first_name: 'Li',
        last_name: 'Si',
      });
      console.log(ret);
      expect(ret).to.deep.equal(data);
    }
  });

  it('updateByUinque', async function () {
    {
      const ret = await User.updateByUnique({
        phone: '1230003',
      }, {
        info: 'user info changed',
      });
      console.log(ret);
      expect(ret).to.deep.equal({
        id: 3,
        phone: '1230003',
        first_name: 'Wang',
        last_name: 'Wu',
        info: { ChineseName: '王五' },
      });
    }
    {
      const ret = await User.getByUnique({
        phone: '1230003',
      });
      console.log(ret);
      expect(ret).to.deep.equal({
        id: 3,
        phone: '1230003',
        first_name: 'Wang',
        last_name: 'Wu',
        info: 'user info changed',
      });
    }
  });

  it('updateByUinque2', async function () {
    {
      const ret = await User.updateByUnique({
        first_name: 'Zhao',
        last_name: 'Liu',
      }, {
        info: 'I am Zhao Liu',
      });
      console.log(ret);
      expect(ret).to.deep.equal({
        id: 4,
        phone: '',
        first_name: 'zhao',
        last_name: 'Liu',
        info: { ChineseName: '赵六' },
      });
    }
    {
      const ret = await User.getByUnique({
        first_name: 'Zhao',
        last_name: 'Liu',
      });
      console.log(ret);
      expect(ret).to.deep.equal({
        id: 4,
        phone: '',
        first_name: 'zhao',
        last_name: 'Liu',
        info: 'I am Zhao Liu',
      });
    }
  });

  it('deleteByUnique', async function () {
    {
      const ret = await User.deleteByUnique({
        phone: '',
      });
      console.log(ret);
      expect(ret).to.deep.equal({
        id: 4,
        phone: '',
        first_name: 'zhao',
        last_name: 'Liu',
        info: 'I am Zhao Liu',
      });
    }
    {
      const ret = await User.getByUnique({
        phone: '',
      });
      console.log(ret);
      expect(ret).to.be.undefined;
    }
    {
      const ret = await User.getByUnique({
        first_name: 'zhao',
        last_name: 'Liu',
      });
      console.log(ret);
      expect(ret).to.be.undefined;
    }
    {
      const ret = await User.getByPrimary({
        id: 4,
      });
      console.log(ret);
      expect(ret).to.be.undefined;
    }
    {
      const ret = await User.count().exec();
      console.log(ret);
      expect(ret).to.equal(3);
    }
  });

  it('removeAllCache', async function () {
    // 先创建缓存
    {
      const ret = await User.getByPrimary({ id: 1 });
      console.log(ret);
      expect(ret).to.have.property('id', 1);
    }
    {
      const ret = await User.getByPrimary({ id: 2 });
      console.log(ret);
      expect(ret).to.have.property('id', 2);
    }
    {
      const ret = await User.getByPrimary({ id: 3 });
      console.log(ret);
      expect(ret).to.have.property('id', 3);
    }
    // 使用别的方法修改内容
    {
      const ret = await User.update({ info: 'no cache' }).exec();
      console.log(ret);
      expect(ret).to.have.property('affectedRows', 3);
    }
    // 删除缓存
    {
      const ret = await User.removeAllCache('1');
      console.log(ret);
      expect(ret).to.be.lengthOf(3);
    }
    // 重新查询
    {
      const ret = await User.getByPrimary({ id: 1 });
      console.log(ret);
      expect(ret).to.include({
        id: 1,
        info: 'no cache',
      });
    }
    {
      const ret = await User.getByPrimary({ id: 2 });
      console.log(ret);
      expect(ret).to.include({
        id: 2,
        info: 'no cache',
      });
    }
    {
      const ret = await User.getByPrimary({ id: 3 });
      console.log(ret);
      expect(ret).to.include({
        id: 3,
        info: 'no cache',
      });
    }
  });

});
