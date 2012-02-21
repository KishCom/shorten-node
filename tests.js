/*
*  Tests for shorten-node
*
*	These test only the functionality of the API, not any functional frontend.
*	Testing done with nodeunit ( https://github.com/caolan/nodeunit )
*/

var settings = require('./settings').shorten_settings;
var DEV_SERVER_HOST = "localhost";
var DEV_SERVER_PORT = "8888";
var http = require('http');
var client = http.createClient(DEV_SERVER_PORT, DEV_SERVER_HOST);
//Our subjects:
var Routes = require('./routes');
var Shorten = require('./shorten');

//TODO: Add more
var validURLs = ['http://www.google.com',
				'http://www.google.com/',
				'http://www.google.com/?',
				'http://www.google.com/?ig',
				'http://www.google.com/analytics?ig',
				'http://google.com',
				'http://google.com/',
				'http://google.com/?',
				'http://google.com/?ig',
				'http://google.com/analytics?ig',
				'https://royalbank.com',
				'https://royalbank.com/derpers/derpers/derpers.ata/index.php',
				'https://royalbank.com/derpers/derpers/derpers.ata/index.php',
				'https://royalbank.com/derpers.ata/',
				'https://royalbank.com//derpers.ata',
				'https://royalbank.com/derpers/derpers/derpers.ata/#somestupidhash',
				'https://royalbank.com/derpers/derpers/derpers.ata/#aonherhash/net.net',
				'https://royalbank.com/derpers/derpers/derpers.ata/#.stillvalid',
				'https://royalbank.com/derpers/derpers/derpers.ata/#././.anyhtingafterahash',
				'https://royalbank.com/derpers/derpers/der%20pers.ata/#././.anyhtingafterahash'
];

//TODO: Add more
var invalidURLs = [ 'http:/www.google.com',
					'32',
					'3!2',
					':2',
					'htp://www.google.com/analytics?ig',
					'ht://google.com',
					'p://google.com/',
					'http:/google.com/?ig',
					'<http:/google.com/?ig',
					'http://' + settings.dev_domain + '/xxxyyy',
					'http://' + settings.dev_domain + '/xxx5yy',
					'http://' + settings.dev_domain + '/xxxyyyfdsfsdfd'
];


exports.Incoming_URLs_appear_to_be_valid_URLs_according_to_the_specifed_examples = function (test){
	var passesAll = true;
	var failedOn = null;
	var shorten = new Shorten();
	for (var i = 0; validURLs.length > i; i++){
		if (!shorten.isURL(validURLs[i])){ //Should always be true!
			passesAll = false;
			failedOn = validURLs[i] + "(Index: " + i + " )";
			break;
		}
	}
	test.ok(passesAll, failedOn);
	test.done();
};

exports.Incoming_URLs_appear_to_be_invalid_URLs_according_to_the_specifed_examples = function (test){
	var passesAll = true;
	var failedOn = null;
	var shorten = new Shorten();
	for (var i = 0; invalidURLs.length > i; i++){
		if (shorten.isURL(invalidURLs[i])){ //Should never be true!
			passesAll = false;
			failedOn = invalidURLs[i] + " (Index: " + i + ")";
			break;
		}
	}
	test.ok(passesAll, failedOn);
	test.done();
};

exports.A_random_generated_hash_is_equal_to_6_characters_long = function(test){
	var shorten = new Shorten();
	shorten.genHash(function(hashGen){
		test.ok(hashGen.length == 6, hashGen + ' is not exactly 6 characters in length');
		test.done();
	});
};

exports.A_random_generated_hash_is_made_of_only_numbers_upper_case_and_lower_case_letters = function(test){
	var shorten = new Shorten();
	shorten.genHash(function(hashGen){
		test.ok(/^[0-9a-zA-Z]+$/.test(hashGen), hashGen + ' failed regular expression: /[0-9a-zA-Z]+/');
		test.done();
	});
};

//API Tests
exports.server_is_up = function(test){
	var headers = {
	    'Host': DEV_SERVER_HOST
	};
	var request = client.request('GET', '/', headers);
	request.on('response', function(response){
		test.ok(response.statusCode == "200", "Server didn't respond with 200 OK. Is it up?");
		response.on('end', function() {
			test.done();
		});
	});
	request.on('error', function(err){
		console.log(err);
	});
	request.end();
};

exports.setLink_responds_with_expected_json_structure = function(test){
	var data = JSON.stringify({ 'originalURL': 'http://google.com' });
	var headers = {
	    'Host': DEV_SERVER_HOST,
	    'Content-Type': 'application/json',
	    'Content-Length': Buffer.byteLength(data,'utf8')
	};
	var request = client.request('POST', '/rpc/setLink', headers);
	request.on('response', function(response){
		var chunks = "";
		response.on('data', function(chunk) {
			chunks += chunk;
		});
		response.on('end', function() {
			chunks = JSON.parse(chunks);
			test.ok(chunks.shortenError == false, " shorten error: " + chunks.shortenError);
			test.ok(chunks.alreadyShortened == false || chunks.alreadyShortened == true, " alreadyShortened missing!");
			test.ok(chunks.originalURL == 'http://google.com', " originalURL doesn't match given originalURL " + chunks.originalURL);
			var shortTest = new RegExp("^http:\/\/" + settings.dev_domain + "\/[a-zA-Z0-9]{6,32}$");
			test.ok(shortTest.test(chunks.shortenedURL), " shortenedURL not a " + settings.dev_domain + " url " + chunks.shortenedURL);
			test.done();
		});
	});
	request.write(data);
	request.end();
};

exports.getLink_responds_with_expected_json_structure = function(test){
	//This test expects a shortened URL that you know exists in the database
	var TEST_LINK_HASH = 'rbv28w';
	var EXPECTED_ORIGINAL_URL = 'http://google.com';
	var data = JSON.stringify({ 'shortenedURL': TEST_LINK_HASH });
	var headers = {
	    'Host': DEV_SERVER_HOST,
	    'Content-Type': 'application/json',
	    'Content-Length': Buffer.byteLength(data,'utf8')
	};
	var request = client.request('POST', '/rpc/getLink', headers);
	request.on('response', function(response){
		var chunks = "";
		response.on('data', function(chunk) {
			chunks += chunk;
		});
		response.on('end', function() {
			chunks = JSON.parse(chunks);
			test.ok(chunks.originalURL == EXPECTED_ORIGINAL_URL, " originalURL for test shortenedURL (" + TEST_LINK_HASH + ") should be " + EXPECTED_ORIGINAL_URL + " - found: " + chunks.originalURL);
			test.ok(chunks.linkHash == TEST_LINK_HASH, " linkHash doesn't match TEST_LINK_HASH (" + TEST_LINK_HASH + ") " + chunks.linkHash);
			test.ok(/^[0-9]+$/.test(chunks.timesUsed) || chunks.timesUsed == null, " timesUsed should be null or integer found: " + chunks.linkHash);
			test.ok(typeof(chunks.topReferrals) == 'object', " topReferrals should be an object, found: " + chunks.topReferrals);
			test.ok(typeof(chunks.topUserAgents) == 'object', " topUserAgents should be an object, found: " + chunks.topUserAgents);
			test.ok(chunks.error == false, " error should be false, this test expects a valid shortenedURL, found: " + chunks.error);
			test.done();
		});
	});
	request.write(data);
	request.end();
};

exports.setLink_responds_with_error_given_specifed_URL_examples = function(test){
	var waitForAllRequests = 0;
	for (var i = 0; invalidURLs.length > i; i++){
		//var i = 2;
		var data = JSON.stringify({ 'originalURL': invalidURLs[i] });
		var headers = {
		    'Host': DEV_SERVER_HOST,
		    'Content-Type': 'application/json',
		    'Content-Length': Buffer.byteLength(data,'utf8')
		};
		var request = client.request('POST', '/rpc/setLink', headers);
		request.on('response', function(response){
			var chunks = "";
			response.on('data', function(chunk) {
				chunks += chunk;
			});
			response.on('end', function() {
				chunks = JSON.parse(chunks);
				test.ok(chunks.shortenError !== false, " shorten error responded false (not error) " + chunks.shortenError);
				test.ok(chunks.alreadyShortened == null, " alreadyShortened should be null for url " + invalidURLs[i] + " got " + chunks.alreadyShortened);
				test.ok(chunks.originalURL !== null, " originalURL doesn't match given originalURL, got:  " + chunks.originalURL);
				test.ok(chunks.shortenedURL == null, " shortenedURL should be null for url.  got " + chunks.shortenedURL);
				waitForAllRequests++;
				if (waitForAllRequests >= invalidURLs.length){
					test.expect((invalidURLs.length*4)); //Expect 4 * the number of urls we're testing
					test.done();
				}
			});
		});
		request.write(data);
		request.end();
	}
};
