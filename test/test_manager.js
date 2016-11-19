'use strict';

/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const expect = require('chai').expect;
const coroutine = require('lei-coroutine');
const { createManager } = require('../');
const { getConnectionConfig, getCacheConfig, readTestFile } = require('./utils');
const { randomString } = require('lei-utils');


describe('Manager', function () {

  const prefix = randomString(10) + ':';
  const manager = createManager(getCacheConfig({
    connections: [ getConnectionConfig() ],
    prefix,
  }));
  console.log(manager);

  before(coroutine.wrap(function* () {
    const sql = yield readTestFile('admins.sql');
    yield manager.connection.query('DROP TABLE IF EXISTS `admins`');
    yield manager.connection.query(sql);
  }));

  after(coroutine.wrap(function* () {
    yield manager.close();
  }));

  it('registerModel', coroutine.wrap(function* () {
    manager.registerModel('Admin', {
      table: 'admins',
      primary: 'id',
      autoIncrement: true,
      fields: {
        id: true,
        name: true,
        email: true,
        info: { type: 'json' },
        created_at: true,
      },
    });
  }));

  it('hasModel', coroutine.wrap(function* () {
    expect(manager.hasModel('Admin')).to.be.true;
    expect(manager.hasModel('admin')).to.be.false;
    expect(manager.hasModel('friend')).to.be.false;
  }));

  it('model', coroutine.wrap(function* () {
    {
      const ret = yield manager.model('Admin').insert({
        name: '超级管理员',
        email: 'admin@ucdok.com',
        info: { role: 'admin' },
        created_at: new Date(),
      }).exec();
      console.log(ret);
      expect(ret.affectedRows).to.equal(1);
      expect(ret.insertId).to.equal(1);
    }
    {
      const ret = yield manager.model('Admin').getByPrimary({ id: 1 });
      console.log(ret);
      expect(ret).to.include({
        id: 1,
        name: '超级管理员',
        email: 'admin@ucdok.com',
      });
    }
    {
      expect(function () {
        manager.model('Haha');
      }).to.throw('model "Haha" does not exists');
    }
  }));

});
