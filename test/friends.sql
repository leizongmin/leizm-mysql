CREATE TABLE `friends` (
  `user_id` INT(11) UNSIGNED NOT NULL DEFAULT '0',
  `friend_id` INT(11) UNSIGNED NOT NULL DEFAULT '0',
  `remark` VARCHAR(50) NOT NULL DEFAULT '',
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`user_id`,`friend_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
