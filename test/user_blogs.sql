CREATE TABLE `user_blogs` (
  `blog_id` int(11) unsigned NOT NULL DEFAULT '0',
  `user_id` int(11) unsigned NOT NULL DEFAULT '0',
  `info` text,
  `created_at` datetime(3),
  `score` int(11) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`blog_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
