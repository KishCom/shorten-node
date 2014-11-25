/* Kish.cm Node.js powered URL Shortener */
var app = false;
var Shorten = function(parentapp){
    this.app = parentapp;
    app = parentapp;
    var settings = require('./settings').shorten_settings;
    if (this.app === undefined){ //for tests
        //Assume a dev server
        this.domain = settings.dev_domain;
    }else{
        this.domain = this.app.settings.domain;
    }
};


/*
* Look up information about a given shortened URL hash
*   Accepts: linkHash (6 to 32 alpha-numeric character string)
*            callback (callback function to return result to)
*
*   Returns: A single Object looking like this
*            {'originalURL': 'http://originalurldestination.com', // Link destination
*             'linkHash': 'xxxYYY', // Kish.cm hash ( http://kish.cm/xxxYYY )
*             'timestamp': '2012-02-19T02:48:26.000Z', // Timestamp of when this was created
*             'id':        ObjectId("4f6e58edaf5c268231000000") // Database ID
*            }
*/
Shorten.prototype.linkHashLookUp = function(linkHash, userInfo, callback){
    //console.log("Looking up linkhash: " + linkHash);
    var mongoose = app.get('mongoose');
    var dbCursor = mongoose.model('LinkMaps');
    dbCursor.find({"linkHash": linkHash}, function(err, results){
        if (err === null){
            if (typeof(callback) === "function"){
                if (results.length === 0){
                    callback(false);
                    return false;
                }else{
                    callback(results[0]);
                    //Log the data back if we have it
                    if (results[0].linkStats.length > 0){
                        results[0].linkStats.push(userInfo);
                    }else{
                        results[0].linkStats = new Array(userInfo);
                    }
                    results[0].save();
                    return results[0];
                }
            }
        }else{
            console.log("Some DB error:");
            console.log(err);
            callback(false);
            return false;
        }
    });
};

/*
* Adds a shortened URL to the database
*    Accepts: originalURL a verifed-as-URL string
*             callback (callback function to return result to)
*    Returns: Result of DB insertion (unused)
*/
Shorten.prototype.addNewShortenLink = function(originalURL, callback){
    var that = this; //Grab this context for after we make a DB query
    var mongoose = app.get('mongoose');

    var newHash = that.genHash(function(newHash){
        var dbCursor = mongoose.model('LinkMaps');
        dbCursor = new dbCursor({linkDestination: originalURL, linkHash: newHash, timestamp: new Date() });
        dbCursor.save(function(err){
            if (err === null){
                if (typeof(callback) === "function"){
                    //Get and return our newly created short URL
                    that.originalURLLookUp(originalURL, callback);
                    return true;
                }
            }else{
                console.log(err);
                return false;
            }
        });
    });
};

/*
* Checks if a URL already exists in the shortened database. If so, return the hash
*   Accepts: originalURL a verifed-as-URL string
*            callback (callback function to return result to)
*
*   Returns: Boolean `False` if URL isn't found in database
*                OR
*            A single Object looking like this
*            {'originalURL': 'http://originalurldestination.com', // Link destination
*             'linkHash': 'xxxYYY', // A lookup hash ( http://kish.cm/xxxYYY )
*             'timestamp': '2012-02-19T02:48:26.000Z', // Timestamp of when this was created
*             'id':        ObjectId("4f6e58edaf5c268231000000") // Database ID
*            }
*/
Shorten.prototype.originalURLLookUp = function (originalURL, callback){
    var mongoose = app.get('mongoose');
    var dbCursor = mongoose.model('LinkMaps');
    dbCursor.find({"linkDestination": originalURL}, function(err, results){
        if (err === null){
            if (typeof(callback) === "function"){
                if (results[0] !== undefined){
                    callback(results[0]);
                    return results[0];
                }else{
                    callback(false);
                    return false;
                }
            }
        }else{
            console.log(err);
        }
    });
};


/*
*  Gets all stats about a given shortened URL
*     Accepts: A URL shortened with this site URL (http://kish.cm/xxxYYY) or just a shortened hash (xxxYYY)
*              callback (callback function to return result to)
*     Returns: MongoDB result set of logged shortened URL redirections
*/
Shorten.prototype.shortenedURLStats = function(shortenedURL, callback) {
    var that = this; //We need this context deep in callback hell. I feel like I'm doing something wrong...
    var alreadyShortTest = new RegExp("^http:\/\/" + this.app.settings.domain + "\/[a-zA-Z0-9]{6,32}$");
    if (alreadyShortTest.test(shortenedURL)){
        var shortenedURLStats = {  'originalURL': null,
                                   'linkHash': shortenedURL,
                                   'timesUsed': null,
                                   'lastUse': null,
                                   'dateShortened': null,
                                   'topReferrals': [],
                                   'topUserAgents': [],
                                   'error' : 'Not a ' + this.app.settings.domain + ' shortened URL'
                               };
                               callback(shortenedURLStats);
                               return shortenedURLStats;
    }
    // Strip domain and slashes
    shortenedURL = shortenedURL.replace("http://" + this.app.settings.domain + "/", "");
    //console.log("Looking up stats for: " + shortenedURL);
    var mongoose = app.get('mongoose');
    var dbCursor = mongoose.model('LinkMaps');
    // We need the link_id, look up the shortened URL first. This is an artifact of being ported over from an ancient PHP app. Will be revised when moving databases
    dbCursor.find({"linkHash": shortenedURL}, function(err, results){
        if (err === null){
            if (typeof(callback) === "function"){
                if (results[0] !== undefined){
                    shortenedURL = results[0];
                    if (shortenedURL.linkStats.length > 0){
                        that.convertResultsToStats(shortenedURL.linkStats, shortenedURL, callback);
                        return shortenedURL.linkStats;
                    }else{
                        var shortenedURLStats = {  'originalURL': shortenedURL.linkDestination,
                           'linkHash': shortenedURL.linkHash,
                           'timesUsed': 0,
                           'lastUse': null,
                           'dateShortened': null,
                           'topReferrals': [],
                           'topUserAgents': [],
                           'error' : 'Shortened URL hasn\'t been used yet'
                       };
                       callback(shortenedURLStats);
                       return shortenedURLStats;
                    }
                }else{
                    var shortenedURLStats = {  'originalURL': null,
                                               'linkHash': shortenedURL,
                                               'timesUsed': null,
                                               'lastUse': null,
                                               'dateShortened': null,
                                               'topReferrals': [],
                                               'topUserAgents': [],
                                               'error' : 'No shortened URL found with this hash'
                                           };
                                           callback(shortenedURLStats);
                                           return shortenedURLStats;
                }
            }
        }else{
            console.log(err);
        }
    });
};


/*
*  Converts MongoDB Result set into expected JSON object format for pass to frontend stats requests
*     Accepts: MongoDB Result Array
*     Returns: JSON object with stats about the URL. Looks like this
*              {'originalURL': 'http://google.com/ig', //Shortened URL destination
*               'linkHash': 'xxxYYY', //Shortened URL hash (http://kish.cm/xxxYYY)
*               'timesUsed': 420, //Number of times shortened URL was redirected
*               'lastUse': '1329244179', //Last time shortened URL was used/redirected (UNIX timestamp)
*               'dateShortened': '2012-02-19T02:53:42.000Z', //Date the URL was shortened
*               'topReferrals': {'http://twitter.com/kishcom': 5, //Object containing top 5 referals for this shortened URL
*                               'http://facebook.com/kishcom': 4,
*                               'http://google.com/s?=kishcom': 2,
*                               'http://duckduckgo.com/s?=kishcom': 1},
*               'topUserAgents':{'Chrome 17': 5, //Object containing top 5 user agents for this shortened URL
*                                'Chrome 15': 4,
*                                'IE8': 3,
*                                'Android': 2,
*                                'iPhone': 1},
*                'error': 'Error string or boolean false'
*                }
*/
Shorten.prototype.convertResultsToStats = function(resultSet, shortenedURL, callback){
    // Setup the object to fill in and return
    var shortenedURLStats = {  'originalURL': shortenedURL.linkDestination,
                               'linkHash': shortenedURL.linkHash,
                               'timesUsed': resultSet.length,
                               'lastUse': resultSet[0].timestamp,
                               'dateShortened': shortenedURL.timestamp,
                               'topReferrals': [],
                               'topUserAgents': [],
                               'error' : false
                           };

    // Get the top 10 useragents and referrers
    var knownAgents = [], knownReferrals = [];
    for (var i = 0; resultSet.length > i; i++){
        // Check known agents for this result
        var found = false;
        for (var a = 0; knownAgents.length > a; a++){
            if (knownAgents[a].userAgent == resultSet[i].userAgent){
                knownAgents[a].agentCount++;
                found = true;
            }
        }
        if (!found){
            knownAgents.push({'userAgent': resultSet[i].userAgent, 'agentCount': 1});
        }
        found = false;

        // Check known referrers for this result
        for (var b = 0; knownReferrals.length > b; b++){
            if (knownReferrals[b].referrer == resultSet[i].referrer){
                knownReferrals[b].referrerCount++;
                found = true;
            }
        }
        if (!found){
            knownReferrals.push({'referrer': resultSet[i].referrer, 'referrerCount': 1});
        }
    }
    function compareReferrer(a, b) {
        if (a.referrerCount > b.referrerCount) { return -1; }
        if (a.referrerCount < b.referrerCount) { return 1; }
        return 0;
    }
    function compareAgent(a, b) {
        if (a.agentCount > b.agentCount) { return -1; }
        if (a.agentCount < b.agentCount) { return 1; }
        return 0;
    }
    shortenedURLStats.topReferrals = knownReferrals.sort(compareReferrer).slice(0,9);
    shortenedURLStats.topUserAgents = knownAgents.sort(compareAgent).slice(0,9);

    callback(shortenedURLStats);
    return shortenedURLStats;
};

/*
* Generates a new 6 character alpha-num link hash
*   Accepts: Nothing
*   Returns: A 6 character alpha-numeric string that can be used as a link hash
*/
Shorten.prototype.genHash = function(callback){

    // Simple random number generator helper
    var randomRange = function(min, max){
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    var newHash = "";
    // 6 digits, alphanumeric
    for (var i = 0; i < 6; i++){
        var digit;
        if (randomRange(0,1) === 0){
           digit = String(randomRange(0,9));
        }else{
           digit = String.fromCharCode(randomRange(97,122));
        }
        newHash = newHash + digit;
    }

    if (this.app !== undefined){ // Tests don't need to check the database - TODO add a new node_env variable/state: test
        var mongoose = app.get('mongoose');
        var dbCursor = mongoose.model('LinkMaps');
        dbCursor.find({"linkHash": newHash}, function(err, results){
            if (err !== null){
                console.log(err);
            }else{
                // Call this function recursively until we find a hash that doesn't exist yet
                if (results.length > 0){
                    // Statistically, this will likely never be called ever
                    this.genHash();
                }else{
                    callback(newHash);
                    return newHash;
                }
            }
        });
    }else{
        callback(newHash);
        return newHash;
    }
};

/**
* Tests to ensure the a given linkHash is ONLY alphanumeric and between 6-32 characters
*   Accepts: A string to test
*   Returns: Boolean `True` if linkHash is ONLY alphanumeric and between 6-32 characters
*/
Shorten.prototype.isValidLinkHash = function(linkHash){
    var linkHashRegex = /^[a-z0-9]{6,32}$/i;
    return linkHashRegex.test(linkHash);
};


/*
*   Tests if this is a URL Kish.cm will shorten or not
*     Accepts: A URL String ("http://www.kishcom.com")
*     Returns: Boolean `true` if the URL can be shortened (is valid and not already shortened)
*
*   TODO: DRY and write this function in one spot for both frontend and backend, you'll notice this function is also in public/media/js/shortener.js
*/
Shorten.prototype.isURL = function(testURL) {
    //Make sure the URL isn't already a URL we've shortened
    var alreadyKishcmTest = new RegExp("^http:\/\/" + this.domain + "\/[a-zA-Z0-9]+$");
    if (alreadyKishcmTest.test(testURL) === false){
        //Make sure URL mostly looks like a URL should
        var mainURLTest = /^(https?):\/\/((?:[a-z0-9.-]|%[0-9A-F]{2}){3,})(?::(\d+))?((?:\/(?:[a-z0-9-._~!$&'()*+,;=:@]|%[0-9A-F]{2})*)*)(?:\?((?:[a-z0-9-._~!$&'()*+,;=:\/?@]|%[0-9A-F]{2})*))?(?:#((?:[a-z0-9-._~!$&'()*+,;=:\/?@]|%[0-9A-F]{2})*))?$/i;
        return mainURLTest.test(testURL);
    }else{
        return false;
    }
};

module.exports = Shorten;