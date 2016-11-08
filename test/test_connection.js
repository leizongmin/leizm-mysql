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

    const conn = createConnection(getConnectionConfig());

  }));

});
