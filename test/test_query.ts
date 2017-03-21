/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import chai = require('chai');
const orm = require('../');

const expect = chai.expect;

describe('QueryBuilder', function () {

  it('select', function () {
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1`');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where('`a`=:a AND `b`=:b', {
        a: 123,
        b: 456,
      }).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
      }).where({
        b: 456,
      }).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where('`a`=? AND `b`=?', [ 123, 456 ]).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).limit(10).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 LIMIT 10');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).skip(10).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 LIMIT 10,18446744073709551615');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).skip(10).limit(20).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 LIMIT 10,20');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).skip(10).limit(20).orderBy('`a` DESC, `b` ASC').build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 ORDER BY `a` DESC, `b` ASC LIMIT 10,20');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
        b: 456,
      }).skip(10).limit(20).orderBy('`a` ?, `b` ?', [ 'DESC', 'ASC' ]).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 ORDER BY `a` DESC, `b` ASC LIMIT 10,20');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
      }).and({
        b: 456,
      }).skip(10).limit(20).orderBy('`a` ?, `b` ?', [ 'DESC', 'ASC' ]).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 AND `b`=456 ORDER BY `a` DESC, `b` ASC LIMIT 10,20');
    }
  });
  it('groupBy', function () {
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
      }).skip(10).limit(20).groupBy('`name`').build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 GROUP BY `name` LIMIT 10,20');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({
        a: 123,
      }).skip(10).limit(20).groupBy('`name` HAVING `b`=?', [ 22 ]).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1` WHERE `a`=123 GROUP BY `name` HAVING `b`=22 LIMIT 10,20');
    }
  });
  it('count', function () {
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.count('c').where({
        a: 456,
        b: 789,
      }).build();
      console.log(sql);
      expect(sql).to.equal('SELECT COUNT(*) AS `c` FROM `test1` WHERE `a`=456 AND `b`=789');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.count('c').where({
        a: 456,
        b: 789,
      }).limit(1).build();
      console.log(sql);
      expect(sql).to.equal('SELECT COUNT(*) AS `c` FROM `test1` WHERE `a`=456 AND `b`=789 LIMIT 1');
    }
  });
  it('insert', function () {
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.insert({
        a: 123,
        b: 456,
      }).build();
      console.log(sql);
      expect(sql).to.equal('INSERT INTO `test1` (`a`, `b`) VALUES (123, 456)');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
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
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.update({
        a: 123,
        b: 456,
      }).build();
      console.log(sql);
      expect(sql).to.equal('UPDATE `test1` SET `a`=123, `b`=456');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.update({
        a: 123,
        b: 456,
      }).limit(12).build();
      console.log(sql);
      expect(sql).to.equal('UPDATE `test1` SET `a`=123, `b`=456 LIMIT 12');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.update({
        a: 123,
        b: 456,
      }).where({
        b: 777,
      }).limit(12).build();
      console.log(sql);
      expect(sql).to.equal('UPDATE `test1` SET `a`=123, `b`=456 WHERE `b`=777 LIMIT 12');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.update({
        a: 123,
      }).set({
        b: 456,
      }).where({
        b: 777,
      }).limit(12).build();
      console.log(sql);
      expect(sql).to.equal('UPDATE `test1` SET `a`=123, `b`=456 WHERE `b`=777 LIMIT 12');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.update().set({
        a: 123,
        b: 456,
      }).where({
        b: 777,
      }).limit(12).build();
      console.log(sql);
      expect(sql).to.equal('UPDATE `test1` SET `a`=123, `b`=456 WHERE `b`=777 LIMIT 12');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      expect(() => {
        query.set({ a: 1 }).build();
      }).throw('query type must be UPDATE, please call .update() before');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      expect(() => {
        query.update().build();
      }).throw('update data connot be empty');
    }
  });
  it('delete', function () {
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.delete().build();
      console.log(sql);
      expect(sql).to.equal('DELETE FROM `test1`');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.delete().where('`a`=2').build();
      console.log(sql);
      expect(sql).to.equal('DELETE FROM `test1` WHERE `a`=2');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.delete().where('`a`=2').limit(1).build();
      console.log(sql);
      expect(sql).to.equal('DELETE FROM `test1` WHERE `a`=2 LIMIT 1');
    }
  });
  it('sql', function () {
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.sql('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data`').build();
      console.log(sql);
      expect(sql).to.equal('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data`');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.sql('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` :$limit').limit(10).build();
      console.log(sql);
      expect(sql).to.equal('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` LIMIT 10');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.sql('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` :$limit').limit(10).skip(5).build();
      console.log(sql);
      expect(sql).to.equal('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` LIMIT 5,10');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.sql('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` :$orderBy :$limit')
                  .limit(10).skip(5).orderBy('`id` ASC').build();
      console.log(sql);
      expect(sql).to.equal('SELECT JSON_OBJECT("key1", 1, "key2", "abc", "key1", "def") as `data` ORDER BY `id` ASC LIMIT 5,10');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.sql('SELECT :$fields FROM `test1`')
                  .fields('a', 'b', 'c').limit(10).skip(5).orderBy('`id` ASC').build();
      console.log(sql);
      expect(sql).to.equal('SELECT `a`, `b`, `c` FROM `test1`');
    }
  });

  it('options', function () {
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.select().options({
        skip: 1,
        limit: 2,
        orderBy: '`id` DESC',
        groupBy: '`name`',
        fields: [ 'id', 'name' ],
      }).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `id`, `name` FROM `test1` GROUP BY `name` ORDER BY `id` DESC LIMIT 1,2');
    }
  });

  it('where(condition): modify condition cannot be empty', function () {
    // SELECT 操作可以为空
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where({}).build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1`');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      const sql = query.select('name', 'age').where('   ').build();
      console.log(sql);
      expect(sql).to.equal('SELECT `name`, `age` FROM `test1`');
    }
    // 其他操作不能为空
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      expect(() => {
        const sql = query.update({ a: 123 }).where({}).build();
        console.log(sql);
      }).to.throw('modify condition cannot be empty');
    }
    {
      const query = orm.createQueryBuilder({ table: 'test1' });
      expect(() => {
        const sql = query.delete().where('   ').build();
        console.log(sql);
      }).to.throw('modify condition cannot be empty');
    }
  });

});
