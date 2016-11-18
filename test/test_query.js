'use strict';

/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const expect = require('chai').expect;
const { createQueryBuilder } = require('../');


describe('QueryBuilder', function () {

  it('select', function () {
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1`');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where('`a`=:a AND `b`=:b', {
        a: 123,
        b: 456,
      }).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where('`a`=? AND `b`=?', [ 123, 456 ]).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).limit(10).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456  LIMIT 10');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).skip(10).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456  LIMIT 10,18446744073709551615');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).skip(10).limit(20).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456  LIMIT 10,20');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).skip(10).limit(20).order('`a` DESC, `b` ASC').build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 ORDER BY `a` DESC, `b` ASC LIMIT 10,20');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).skip(10).limit(20).order('`a` ?, `b` ?', [ 'DESC', 'ASC' ]).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 ORDER BY `a` DESC, `b` ASC LIMIT 10,20');
    }
  });
  it('count', function () {
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.count('c').where({
        a: 456,
        b: 789,
      }).build();
      console.log(sql);
      expect(sql).to.equal('SELECT COUNT(*) AS `c` FROM `test1` WHERE `a`=456 AND `b`=789');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.count('c').where({
        a: 456,
        b: 789,
      }).limit(1).build();
      console.log(sql);
      expect(sql).to.equal('SELECT COUNT(*) AS `c` FROM `test1` WHERE `a`=456 AND `b`=789  LIMIT 1');
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
      expect(sql).to.equal('INSERT INTO `test1` (`a`, `b`) VALUES (123, 456)');
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
      expect(sql).to.equal('INSERT INTO `test1` (`a`, `b`) VALUES (123, 456),\n(789, 110)');
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
      expect(sql).to.equal('UPDATE `test1` SET `a`=123, `b`=456');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.update({
        a: 123,
        b: 456,
      }).limit(12).build();
      console.log(sql);
      expect(sql).to.equal('UPDATE `test1` SET `a`=123, `b`=456  LIMIT 12');
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
      expect(sql).to.equal('UPDATE `test1` SET `a`=123, `b`=456 WHERE `b`=777 LIMIT 12');
    }
  });
  it('delete', function () {
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.delete().build();
      console.log(sql);
      expect(sql).to.equal('DELETE FROM `test1`');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.delete().where('`a`=2').build();
      console.log(sql);
      expect(sql).to.equal('DELETE FROM `test1` WHERE `a`=2');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.delete().where('`a`=2').limit(1).build();
      console.log(sql);
      expect(sql).to.equal('DELETE FROM `test1` WHERE `a`=2 LIMIT 1');
    }
  });
  it('sql', function () {
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.sql('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data`').build();
      console.log(sql);
      expect(sql).to.equal('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data`');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.sql('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` :$limit').limit(10).build();
      console.log(sql);
      expect(sql).to.equal('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` LIMIT 10');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.sql('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` :$limit').limit(10).skip(5).build();
      console.log(sql);
      expect(sql).to.equal('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` LIMIT 5,10');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.sql('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` :$orderBy :$limit')
                  .limit(10).skip(5).order('`id` ASC').build();
      console.log(sql);
      expect(sql).to.equal('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` ORDER BY `id` ASC LIMIT 5,10');
    }
    {
      const query = createQueryBuilder({ table: 'test1' });
      const sql = query.sql('SELECT :$fields FROM `test1`')
                  .fields('a', 'b', 'c').limit(10).skip(5).order('`id` ASC').build();
      console.log(sql);
      expect(sql).to.equal('SELECT `a`, `b`, `c` FROM `test1`');
    }
  });

});
