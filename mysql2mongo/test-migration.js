var http = require('http');
var color = require('ansi-color').set;

var mysql_host = "kish.cm";
var mysql_port = "80";
var mongodb_host = "me.kish.cm";
var mongodb_port = "80";


var knownGoodShortURL = process.argv[2] ? process.argv[2] : "65z8d3"

var data = JSON.stringify({ 'shortenedURL': knownGoodShortURL });
var Myheaders = {
	'Host': mysql_host,
	'Content-Type': 'application/json',
	'Content-Length': Buffer.byteLength(data,'utf8')
};
var Mongheaders = {
	'Host': mongodb_host,
	'Content-Type': 'application/json',
	'Content-Length': Buffer.byteLength(data,'utf8')
};

var mysqlData = null, mongodbData = null;

var requestMysql = http.createClient(mysql_port, mysql_host).request('POST', '/rpc/getLink', Myheaders);
requestMysql.on('response', function(response){
	var chunks = "";
	response.on('data', function(chunk) {
		chunks += chunk;
	});
	response.on('end', function() {
		chunks = JSON.parse(chunks);

		mysqlData = chunks;
		if (mongodbData !== null){
			runTests();
		}
		/*
		test.ok(chunks.originalURL == EXPECTED_ORIGINAL_URL, " originalURL for test shortenedURL (" + TEST_LINK_HASH + ") should be " + EXPECTED_ORIGINAL_URL + " - found: " + chunks.originalURL);
		test.ok(chunks.linkHash == TEST_LINK_HASH, " linkHash doesn't match TEST_LINK_HASH (" + TEST_LINK_HASH + ") " + chunks.linkHash);
		test.ok(/^[0-9]+$/.test(chunks.timesUsed) || chunks.timesUsed === null, " timesUsed should be null or integer found: " + chunks.linkHash);
		test.ok(typeof(chunks.topReferrals) == 'object', " topReferrals should be an object, found: " + chunks.topReferrals);
		test.ok(typeof(chunks.topUserAgents) == 'object', " topUserAgents should be an object, found: " + chunks.topUserAgents);
		test.ok(chunks.error === false, " error should be false, this test expects a valid shortenedURL, found: " + chunks.error);
		test.done();
		*/
	});
});
requestMysql.write(data);
requestMysql.end();


var requestMongo = http.createClient(mongodb_port, mongodb_host).request('POST', '/rpc/getLink', Mongheaders);
requestMongo.on('response', function(response){
	var chunks = "";
	response.on('data', function(chunk) {
		chunks += chunk;
	});
	response.on('end', function() {
		chunks = JSON.parse(chunks);
		mongodbData = chunks;
		if (mysqlData !== null){
			runTests();
		}
		/*
		test.ok(chunks.originalURL == EXPECTED_ORIGINAL_URL, " originalURL for test shortenedURL (" + TEST_LINK_HASH + ") should be " + EXPECTED_ORIGINAL_URL + " - found: " + chunks.originalURL);
		test.ok(chunks.linkHash == TEST_LINK_HASH, " linkHash doesn't match TEST_LINK_HASH (" + TEST_LINK_HASH + ") " + chunks.linkHash);
		test.ok(/^[0-9]+$/.test(chunks.timesUsed) || chunks.timesUsed === null, " timesUsed should be null or integer found: " + chunks.linkHash);
		test.ok(typeof(chunks.topReferrals) == 'object', " topReferrals should be an object, found: " + chunks.topReferrals);
		test.ok(typeof(chunks.topUserAgents) == 'object', " topUserAgents should be an object, found: " + chunks.topUserAgents);
		test.ok(chunks.error === false, " error should be false, this test expects a valid shortenedURL, found: " + chunks.error);
		test.done();
		*/
	});
});
requestMongo.write(data);
requestMongo.end();

function runTests(){
	//TEST!

	if (mysqlData.originalURL !== mongodbData.originalURL){
		console.log(color("Error: ", "red+bold"),  ": originalURL mis-match:");
		console.log("   mysql:" + mysqlData.originalURL);
		console.log("   mongo:" + mongodbData.originalURL);
	}else{
		console.log(color("Good: ", "green+bold"), "originalURL matches for " + mysqlData.linkHash + ": " + mysqlData.originalURL);
	}
	if (mysqlData.timesUsed !== mongodbData.timesUsed){
		console.log(color("Error: ", "red+bold"),  ": timesUsed mis-match:");
		console.log("   mysql:" + mysqlData.timesUsed);
		console.log("   mongo:" + mongodbData.timesUsed);
	}else{
		console.log(color("Good: ", "green+bold"), "timesUsed matches for " + mysqlData.linkHash + ": " + mysqlData.timesUsed);
	}
}