'use strict';

/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const assert = require('assert');
const coroutine = require('lei-coroutine');
const { createQueryBuilder } = require('../');


describe('QueryBuilder', function () {

  it('select', function () {
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').build();
      console.log(sql);
      assert.equal(sql, 'SELECT `name`, `age` FROM `test1`');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).build();
      console.log(sql);
      assert.equal(sql, 'SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where('`a`=:a AND `b`=:b', {
        a: 123,
        b: 456,
      }).build();
      console.log(sql);
      assert.equal(sql, 'SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where('`a`=? AND `b`=?', [ 123, 456 ]).build();
      console.log(sql);
      assert.equal(sql, 'SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).limit(10).build();
      console.log(sql);
      assert.equal(sql, 'SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456  LIMIT 10');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).skip(10).build();
      console.log(sql);
      assert.equal(sql, 'SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456  LIMIT 10,18446744073709551615');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).skip(10).limit(20).build();
      console.log(sql);
      assert.equal(sql, 'SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456  LIMIT 10,20');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).skip(10).limit(20).order('`a` DESC, `b` ASC').build();
      console.log(sql);
      assert.equal(sql, 'SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 ORDER BY `a` DESC, `b` ASC LIMIT 10,20');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).skip(10).limit(20).order('`a` ?, `b` ?', [ 'DESC', 'ASC' ]).build();
      console.log(sql);
      assert.equal(sql, 'SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 ORDER BY `a` DESC, `b` ASC LIMIT 10,20');
    }
  });
  it('insert', function () {
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.insert({
        a: 123,
        b: 456,
      }).build();
      console.log(sql);
      assert.equal(sql, 'INSERT INTO `test1` (`a`, `b`) VALUES (123, 456)');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.insert([{
        a: 123,
        b: 456,
      }, {
        a: 789,
        b: 110,
      }]).build();
      console.log(sql);
      assert.equal(sql, 'INSERT INTO `test1` (`a`, `b`) VALUES (123, 456),\n(789, 110)');
    }
  });
  it('update', function () {
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.update({
        a: 123,
        b: 456,
      }).build();
      console.log(sql);
      assert.equal(sql, 'UPDATE `test1` SET `a`=123, `b`=456');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.update({
        a: 123,
        b: 456,
      }).limit(12).build();
      console.log(sql);
      assert.equal(sql, 'UPDATE `test1` SET `a`=123, `b`=456  LIMIT 12');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.update({
        a: 123,
        b: 456,
      }).where({
        b: 777,
      }).limit(12).build();
      console.log(sql);
      assert.equal(sql, 'UPDATE `test1` SET `a`=123, `b`=456 WHERE `b`=777 LIMIT 12');
    }
  });
  it('delete', function () {
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.delete().build();
      console.log(sql);
      assert.equal(sql, 'DELETE FROM `test1`');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.delete().where('`a`=2').build();
      console.log(sql);
      assert.equal(sql, 'DELETE FROM `test1` WHERE `a`=2');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.delete().where('`a`=2').limit(1).build();
      console.log(sql);
      assert.equal(sql, 'DELETE FROM `test1` WHERE `a`=2 LIMIT 1');
    }
  });

});
