'use strict';

/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const fs = require('fs');
const path = require('path');
const expect = require('chai').expect;
const coroutine = require('lei-coroutine');
const { createModel, createCache, createConnection } = require('../');
const { getConnectionConfig, getCacheConfig } = require('./utils');
const { randomString } = require('lei-utils');


describe('Model', function () {

  const prefix = randomString(10) + ':';
  const cache = createCache(getCacheConfig({ prefix }));
  const connection = createConnection({ connections: [ getConnectionConfig() ]});
  const model = createModel({
    cache, connection,
    table: 'user_blogs',
    primary: [ 'blog_id', 'user_id' ],
    fields: {
      blog_id: true,
      user_id: true,
      info: { type: 'json' },
      created_at: true,
    },
  });

  before(function (done) {
    fs.readFile(path.resolve(__dirname, 'user_blogs.sql'), (err, sql) => {
      if (err) return done(err);
      connection.query('DROP TABLE IF EXISTS `user_blogs`', err => {
        if (err) return done(err);
        connection.query(sql.toString(), done);
      });
    });
  });

  it('insert', coroutine.wrap(function* () {
    const data = {
      blog_id: 1,
      user_id: 1001,
      info: {
        mem: process.memoryUsage(),
        uptime: process.uptime(),
      },
      created_at: new Date(),
    };
    {
      const ret = yield model.insert(data).exec();
      console.log(ret);
      expect(ret.affectedRows).to.equal(1);
    }
    {
      const ret = yield model.findOne(model.keepPrimaryFields(data)).exec();
      console.log(ret);
      expect(ret).to.deep.equal(data);
    }
  }));

});
