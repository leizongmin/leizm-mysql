'use strict';

/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const expect = require('chai').expect;
const coroutine = require('lei-coroutine');
const { createModel, createCache, createConnection } = require('../');
const { getConnectionConfig, getCacheConfig, readTestFile } = require('./utils');
const { randomString } = require('lei-utils');


describe('Model - * by primary and cache', function () {

  const prefix = randomString(10) + ':';
  const cache = createCache(getCacheConfig({ prefix }));
  const connection = createConnection({ connections: [ getConnectionConfig() ]});
  const User = createModel({
    cache, connection,
    table: 'users',
    primary: 'id',
    autoIncrement: true,
    fields: {
      id: true,
      name: true,
      email: true,
      info: { type: 'json' },
      created_at: true,
      score: true,
    },
  });
  const Friend = createModel({
    cache, connection,
    table: 'friends',
    primary: [ 'user_id', 'friend_id' ],
    fields: {
      user_id: true,
      friend_id: true,
      created_at: true,
      remark: true,
    },
  });

  before(coroutine.wrap(function* () {
    {
      const sql = yield readTestFile('users.sql');
      yield connection.query('DROP TABLE IF EXISTS `users`');
      yield connection.query(sql);
    }
    {
      const sql = yield readTestFile('friends.sql');
      yield connection.query('DROP TABLE IF EXISTS `friends`');
      yield connection.query(sql);
    }
  }));

  after(coroutine.wrap(function* () {
    yield connection.close();
    yield cache.close();
  }));

  it('insert data', coroutine.wrap(function* () {
    {
      const ret = yield User.insert([{
        name: '张三',
        email: 'zhangsan@ucdok.com',
        info: { age: 20 },
        created_at: new Date(),
        score: 0,
        otherField: 'test',
      }, {
        name: '李四',
        email: 'lisi@ucdok.com',
        info: { },
        created_at: new Date(),
        score: 0,
        otherField: 'test',
      }, {
        name: '王五',
        email: 'wangwu@ucdok.com',
        info: { age: 18, gender: 'male' },
        created_at: new Date(),
        score: 0,
        otherField: 'test',
      }]).exec();
      console.log(ret);
    }
    {
      const ret = yield Friend.insert([{
        user_id: 1,
        friend_id: 2,
        created_at: new Date(),
        remark: '阿四',
        otherField: 'test',
      }, {
        user_id: 1,
        friend_id: 3,
        created_at: new Date(),
        remark: '阿五',
        otherField: 'test',
      }, {
        user_id: 2,
        friend_id: 1,
        created_at: new Date(),
        remark: '小三',
        otherField: 'test',
      }, {
        user_id: 3,
        friend_id: 1,
        created_at: new Date(),
        remark: '阿三',
        otherField: 'test',
      }]).exec();
      console.log(ret);
    }
  }));

  it('getByPrimary', coroutine.wrap(function* () {
    {
      const ret = yield User.getByPrimary({ id: 1, otherField: 'test' });
      console.log(ret);
      expect(ret).to.include({
        name: '张三',
        email: 'zhangsan@ucdok.com',
      });
    }
    {
      const ret = yield Friend.getByPrimary({ user_id: 1, friend_id: 2, otherField: 'test' });
      console.log(ret);
      expect(ret).to.include({
        user_id: 1,
        friend_id: 2,
        remark: '阿四',
      });
    }
  }));

  it('updateByPrimary', coroutine.wrap(function* () {
    {
      const ret = yield User.updateByPrimary({ id: 1 }, { name: '张三丰', otherField: 'test' });
      console.log(ret);
      expect(ret.affectedRows).to.equal(1);
    }
    {
      const ret = yield User.getByPrimary({ id: 1 });
      console.log(ret);
      expect(ret).to.include({
        name: '张三丰',
        email: 'zhangsan@ucdok.com',
      });
    }
    {
      const ret = yield Friend.updateByPrimary({
        user_id: 1,
        friend_id: 2,
        otherField: 'test',
      }, {
        remark: '小四',
        otherField: 'test',
      });
      console.log(ret);
      expect(ret.affectedRows).to.equal(1);
    }
    {
      const ret = yield Friend.getByPrimary({
        user_id: 1,
        friend_id: 2,
        otherField: 'test',
      });
      console.log(ret);
      expect(ret).to.include({
        user_id: 1,
        friend_id: 2,
        remark: '小四',
      });
    }
  }));

  it('deleteByPrimary', coroutine.wrap(function* () {
    {
      const ret = yield User.deleteByPrimary({ id: 1, otherField: 'test' });
      console.log(ret);
      expect(ret.affectedRows).to.equal(1);
    }
    {
      const ret = yield User.getByPrimary({ id: 1, otherField: 'test' });
      console.log(ret);
      expect(ret).to.be.undefined;
    }
    {
      const ret = yield Friend.deleteByPrimary({
        user_id: 1,
        friend_id: 2,
        otherField: 'test',
      });
      console.log(ret);
      expect(ret.affectedRows).to.equal(1);
    }
    {
      const ret = yield Friend.getByPrimary({
        user_id: 1,
        friend_id: 2,
        otherField: 'test',
      });
      console.log(ret);
      expect(ret).to.be.undefined;
    }
  }));

  it('finish', coroutine.wrap(function* () {
    {
      const list = yield User.find().exec();
      console.log(list);
      expect(list).to.have.lengthOf(2);
    }
    {
      const list = yield Friend.find().exec();
      console.log(list);
      expect(list).to.have.lengthOf(3);
    }
  }));

});
