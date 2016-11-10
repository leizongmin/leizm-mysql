'use strict';

/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const { EventEmitter } = require('events');

class Manager extends EventEmitter {

  constructor(options) {
    super();
  }

  registerModel(table, fields) {

  }

  model(name) {

  }

}

module.exports = Manager;
