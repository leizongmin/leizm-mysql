CREATE TABLE `users4` (
  `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `phone` VARCHAR(50) NOT NULL DEFAULT '',
  `first_name` VARCHAR(50) NOT NULL DEFAULT '',
  `last_name` VARCHAR(255) NOT NULL DEFAULT '',
  `info` TEXT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `first_name` (`first_name`,`last_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
