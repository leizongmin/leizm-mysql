'use strict';

/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const assert = require('assert');
const coroutine = require('lei-coroutine');
const { createManager } = require('../');
const { getConnectionConfig, getCacheConfig } = require('./utils');


describe('Manager', function () {

  it('ok', coroutine.wrap(function* () {

    const manager = createManager(getCacheConfig({
      connections: [ getConnectionConfig() ],
    }));

    console.log(manager);

    yield manager.close();

  }));

});
