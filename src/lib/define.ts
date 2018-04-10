/**
 * @leizm/mysql
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

/**
 * 回调函数
 */
export interface Callback<T> {
  (err: Error | null, ret?: T): void;
  promise?: Promise<T>;
}

/**
 * 数据行
 */
export type DataRow = Record<string, any>;

/**
 * 执行 SQL 更新和插入操作返回的结果
 */
export interface OkPacket {
  fieldCount: number;
  affectedRows: number;
  insertId: number;
  serverStatus: number;
  warningCount: number;
  message: string;
  protocol41: true;
  changedRows: number;
}
