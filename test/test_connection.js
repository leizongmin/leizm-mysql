'use strict';

/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const assert = require('assert');
const coroutine = require('lei-coroutine');
const { createConnection } = require('../');

function getConnectionConfig(config) {
  return Object.assign({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'test',
    connectionLimit: 2,
    charset: 'utf8mb4',
  }, config || {});
}

describe('Connection', function () {

  it('connection ok', coroutine.wrap(function* () {

    const conn = createConnection({
      connections: [ getConnectionConfig() ],
    });
    {
      const ret = yield conn.query('SHOW TABLES');
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
    // {
    //   const c = yield conn.getConnection();
    //   console.log(c.escape(new Date()));
    //   yield c.beginTransaction();
    //   try {
    //     const ret = yield c.query('INSERT INTO `blog_contents`(`id`,`content`) VALUES (1234, "456")');
    //     console.log(ret);
    //   } catch (err) {
    //     console.log(err);
    //     yield c.rollback();
    //   }
    //   try {
    //     const ret = yield c.query('INSERT INTO `blog_contents`(`id`,`content`) VALUES (1234, "9999")');
    //     console.log(ret);
    //   } catch (err) {
    //     console.log(err);
    //     yield c.rollback();
    //   }
    //   try {
    //     yield c.commit();
    //   } catch (err) {
    //     console.log(err);
    //     yield c.rollback();
    //   }
    //   c.release();
    // }
    yield conn.close();

  }));

});
