CREATE TABLE `user_blogs` (
  `blog_id` INT(11) UNSIGNED NOT NULL DEFAULT '0',
  `user_id` INT(11) UNSIGNED NOT NULL DEFAULT '0',
  `info` TEXT,
  `created_at` DATETIME(3),
  `score` INT(11) UNSIGNED NOT NULL DEFAULT '0',
  PRIMARY KEY (`blog_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
