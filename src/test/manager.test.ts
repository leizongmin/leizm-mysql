/**
 * @leizm/mysql tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import { expect } from 'chai';
import * as mysql from '../lib';
import * as utils from './utils';

describe('Manager', function() {
  const prefix = utils.randomString(10) + ':';
  const manager = new mysql.Manager(
    utils.getCacheConfig({
      connections: [utils.getConnectionConfig()],
      prefix,
    })
  );
  utils.debug(manager);

  beforeAll(async function() {
    const sql = await utils.readTestFile('admins.sql');
    await manager.connection.query('DROP TABLE IF EXISTS `admins`');
    await manager.connection.query(sql);
  });

  afterAll(async function() {
    await manager.close();
  });

  it('registerTable', async function() {
    await 0;
    manager.registerTable({
      table: 'admins',
      primary: 'id',
      autoIncrement: true,
      fields: {
        id: true,
        name: true,
        email: true,
        info: 'json',
        created_at: 'date',
      },
    });
  });

  it('hasTable', async function() {
    await 0;
    expect(manager.hasTable('admins')).to.be.true;
    expect(manager.hasTable('admin')).to.be.false;
    expect(manager.hasTable('friend')).to.be.false;
  });

  it('table', async function() {
    {
      const ret = await manager.table('admins').insert({
        name: '超级管理员',
        email: 'admin@ucdok.com',
        info: { role: 'admin' },
        created_at: utils.newDate(),
      });
      utils.debug(ret);
      expect(ret.length).to.equal(1);
      expect(ret[0].id).to.equal(1);
    }
    {
      const ret = await manager.table('admins').getByPrimary({ id: 1 });
      utils.debug(ret);
      expect(ret).to.include({
        id: 1,
        name: '超级管理员',
        email: 'admin@ucdok.com',
      });
    }
    {
      expect(function() {
        manager.table('Haha');
      }).to.throw('table "Haha" does not exists');
    }
  });
});
