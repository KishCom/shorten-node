/*
*  Tests for shorten-node
*
*	These test only the functionality of the API, not any functional frontend.
*	Testing done with nodeunit ( https://github.com/caolan/nodeunit )
*/

var settings = require('./settings').shorten_settings;
var DEV_SERVER_HOST = "http://" + settings.dev_domain;
var DEV_SERVER_PORT = process.env.SERVER_PORT || 8888;

//Some tests expect a shortened URL that you know exists in the database
var TEST_LINK_HASH = 'twthoe';
var EXPECTED_ORIGINAL_URL = 'http://reddit.com';

var request = require('request'),
	async = require('async');
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
	request({"uri": DEV_SERVER_HOST}, function(err, http, body){
		if (err){
			console.log(err);
		}
		test.ok(http.statusCode === 200, "Server didn't respond with 200 OK. Is it up?");
		test.done();
	});
};

exports.setLink_responds_with_expected_json_structure = function(test){
	var data = JSON.stringify({ 'originalURL': 'http://google.com' });
	var headers = {
		'Host': DEV_SERVER_HOST,
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(data,'utf8')
	};

	request({	"uri": DEV_SERVER_HOST + '/rpc/setLink',
				"headers": headers,
				"method": "POST",
				"body": data
			}, function(err, http, body){
				var chunks;
				try{
					chunks = JSON.parse(body);
				}catch( e ){
					test.ok(false, JSON.stringify(e));
					test.done();
				}
				test.ok(chunks.shortenError === false, " shorten error: " + chunks.shortenError);
				test.ok(chunks.alreadyShortened === false || chunks.alreadyShortened === true, " alreadyShortened missing!");
				test.ok(chunks.originalURL === 'http://google.com', " originalURL doesn't match given originalURL " + chunks.originalURL);
				var shortTest = new RegExp("^http:\/\/" + settings.dev_domain + "\/[a-zA-Z0-9]{6,32}$");
				test.ok(shortTest.test(chunks.shortenedURL), " shortenedURL not a " + settings.dev_domain + " url " + chunks.shortenedURL);
				test.done();
		});
};

exports.getLink_responds_with_expected_json_structure = function(test){
	var data = JSON.stringify({ 'shortenedURL': TEST_LINK_HASH });
	var headers = {
		'Host': DEV_SERVER_HOST,
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(data,'utf8')
	};
	request({	"uri": DEV_SERVER_HOST + '/rpc/getLink',
				"headers": headers,
				"method": "POST",
				"body": data
		}, function(err, http, body){
			var chunks;
			try{
				chunks = JSON.parse(body);
			}catch( e ){
				test.ok(false, JSON.stringify(e));
				test.done();
			}
			test.ok(chunks.error === false, "Ensure you have a URL already shortened (and used that short-url) in this instance, and that the link hash and destination are in tests.js. (Currently hash: " + TEST_LINK_HASH + ") should be " + EXPECTED_ORIGINAL_URL + ")");
			test.ok(chunks.originalURL === EXPECTED_ORIGINAL_URL, " originalURL for test shortenedURL (" + TEST_LINK_HASH + " should be " + EXPECTED_ORIGINAL_URL + " - found: " + chunks.originalURL);
			test.ok(chunks.linkHash === TEST_LINK_HASH, " linkHash doesn't match TEST_LINK_HASH (" + TEST_LINK_HASH + ") " + chunks.linkHash);
			test.ok(/^[0-9]+$/.test(chunks.timesUsed) || chunks.timesUsed === null, " timesUsed should be null or integer found: " + chunks.linkHash);
			test.ok(typeof(chunks.topReferrals) == 'object', " topReferrals should be an object, found: " + chunks.topReferrals);
			test.ok(typeof(chunks.topUserAgents) == 'object', " topUserAgents should be an object, found: " + chunks.topUserAgents);
			test.done();
	});
};


exports.setLink_responds_with_error_given_specifed_URL_examples = function(test){
	var q = async.queue(function (task, callback) {
		var data = JSON.stringify({ 'originalURL': task.badURL });
		var headers = {
			'Host': DEV_SERVER_HOST,
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(data,'utf8')
		};
		//console.log(data);
		request({	"uri": DEV_SERVER_HOST + '/rpc/setLink',
					"headers": headers,
					"method": "POST",
					"body": data
		}, function(err, http, body){
				var chunks;
				try{
					chunks = JSON.parse(body);
				}catch( e ){
					test.ok(false, JSON.stringify(e));
					test.done();
				}
				test.ok(chunks.shortenError !== false, " shorten error responded false (not error) " + chunks.shortenError);
				test.ok(chunks.alreadyShortened === null, " alreadyShortened should be null got " + chunks.alreadyShortened);
				test.ok(chunks.originalURL !== null, " originalURL doesn't match given originalURL, got:  " + chunks.originalURL);
				test.ok(chunks.shortenedURL === null, " shortenedURL should be null for url.  got " + chunks.shortenedURL);
		});
		callback();
	}, 1);

	// assign a callback to the async/q
	q.drain = function() {
		test.done();
	};

	for (var i = 0; invalidURLs.length > i; i++){
		q.push({"badURL": invalidURLs[i]});
	}
};