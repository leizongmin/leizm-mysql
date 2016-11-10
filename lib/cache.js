'use strict';

/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const Redis = require('ioredis');
const { EventEmitter } = require('events');

class Cache extends EventEmitter {

  constructor(options) {
    super();
  }

  saveList(list, callback) {

  }

  getList(list, callback) {

  }

  removeList(list, callback) {

  }

}

module.exports = Cache;
