var mysql = require('mysql'),
settings = require('./settings').shorten_settings;

//Load this SQL manually if you'd prefer
var sqlStructure = "CREATE TABLE IF NOT EXISTS `shorten_linkmaps` (`id` int(11) NOT NULL AUTO_INCREMENT,`linkDestination` varchar(512) NOT NULL,`linkHash` varchar(8) NOT NULL,`timestamp` datetime NOT NULL,PRIMARY KEY (`id`)) ENGINE=MyISAM  DEFAULT CHARSET=latin1;CREATE TABLE IF NOT EXISTS `shorten_linkstats` (`id` int(11) NOT NULL AUTO_INCREMENT,`ip` char(15) NOT NULL,`userAgent` varchar(255) NOT NULL,`referrer` varchar(512) NOT NULL,`timestamp` datetime NOT NULL,`linkId_id` int(11) NOT NULL,PRIMARY KEY (`id`),KEY `shorten_linkstats_11e70f3` (`linkId_id`)) ENGINE=MyISAM  DEFAULT CHARSET=latin1;";

var devOrLive = process.argv[2];
var mysqlc;

if (devOrLive == "dev"){
	mysqlc = mysql.createClient({host: settings.dev_mysql.host, user: settings.dev_mysql.user, password: settings.dev_mysql.password, database: settings.dev_mysql.dbname, port: settings.dev_mysql.port});
	makeDB();
}else if(devOrLive == "live"){
	mysqlc = mysql.createClient({host: settings.live_mysql.host, user: settings.live_mysql.user, password: settings.live_mysql.password, database: settings.live_mysql.dbname, port: settings.live_mysql.port});
	makeDB();
}else{
	console.log("usage: node setup_db.js dev");
	console.log("   OR: node setup_db.js live");
}

function makeDB(){
	mysqlc.query(sqlStructure, function(err, results, fields){
		if (err === null){
			console.error("DB initalized for " + devOrLive);
			process.exit(1);
			return true;
		}else{
			console.error(err);
			process.exit(1);
			return false;
		}
	});
}
