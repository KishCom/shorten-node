-- Table structure for table `shorten_linkmaps`
CREATE TABLE IF NOT EXISTS `shorten_linkmaps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `linkDestination` varchar(512) NOT NULL,
  `linkHash` varchar(8) NOT NULL,
  `timestamp` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1;

-- Table structure for table `shorten_linkstats`
CREATE TABLE IF NOT EXISTS `shorten_linkstats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ip` char(15) NOT NULL,
  `userAgent` varchar(255) NOT NULL,
  `referrer` varchar(512) NOT NULL,
  `timestamp` datetime NOT NULL,
  `linkId_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `shorten_linkstats_11e70f3` (`linkId_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1;
