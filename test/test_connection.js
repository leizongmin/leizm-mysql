'use strict';

/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const expect = require('chai').expect;
const coroutine = require('lei-coroutine');
const { createConnection } = require('../');
const { getConnectionConfig, readTestFile } = require('./utils');


describe('Connection', function () {

  it('getConnection() support promise', coroutine.wrap(function* () {

    const conn = createConnection({
      connections: [ getConnectionConfig() ],
    });
    {
      const ret = yield conn.query('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data`');
      console.log(ret);
    }
    {
      const ret = yield conn.query('DROP TABLE IF EXISTS `blog_contents`');
      console.log(ret);
    }
    {
      const sql = yield readTestFile('blog_contents.sql');
      const ret = yield conn.query(sql);
      console.log(ret);
    }
    {
      const sql = conn.format('SELECT * FROM ::table WHERE id=:id', {
        table: 'blog_contents',
        id: 2,
      });
      console.log(sql);
      const ret = yield conn.query(sql);
      console.log(ret);
    }
    {
      const sql = conn.format('SELECT * FROM ?? WHERE id=?', [ 'blog_contents', 2 ]);
      console.log(sql);
      const ret = yield conn.query(sql);
      console.log(ret);
    }
    {
      const c = yield conn.getMasterConnection();
      console.log(c.escape(new Date()));
      yield c.beginTransaction();
      try {
        const ret = yield c.query('INSERT INTO `blog_contents`(`id`,`content`) VALUES (1234, "456")');
        console.log(ret);
      } catch (err) {
        console.log(err);
        yield c.rollback();
      }
      try {
        const ret = yield c.query('INSERT INTO `blog_contents`(`id`,`content`) VALUES (1234, "9999")');
        console.log(ret);
      } catch (err) {
        console.log(err);
        yield c.rollback();
      }
      try {
        yield c.commit();
      } catch (err) {
        console.log(err);
        yield c.rollback();
      }
      c.release();
    }
    yield conn.close();

  }));

});
