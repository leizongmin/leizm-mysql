CREATE TABLE `user_blogs` (
  `blog_id` int(11) unsigned NOT NULL,
  `user_id` int(11) unsigned NOT NULL,
  `info` text NOT NULL,
  `created_at` datetime(3) NOT NULL,
  `score` int(11) unsigned NOT NULL,
  PRIMARY KEY (`blog_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
