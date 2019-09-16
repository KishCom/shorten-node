/*
*   shorten-node - A URL Shortening web app
*    URL Routes
*    There are 5 routes here:
*     - index, and developer (static pages)
*     - navLink, setLink, and getLink
*
*    Andrew Kish, Feb 2012 - Dec 2014 - Sept 2019
*/

var Shorten = require('./shorten'), shorten, log; //Utility functions for shoterner
var sanitize = require('sanitize-caja'); //For XSS prevention
var accepts = require('accepts');
var escapeHtml = require('escape-html');

//We pass the app context to the shorten utility handlers since it needs access too
var Routes = function(app){
    this.app = app;
    shorten = new Shorten(app);
    log = app.get('bunyan');
};

/*
* Landing and developer info pages, two functions as simple as it gets
*
*/
Routes.prototype.index = function (req, res){
    res.render('index', {devmode: req.app.settings.env, domain: req.app.set('domain')});
};
Routes.prototype.developers = function (req, res){
    res.render('developers', {devmode: req.app.settings.env, domain: req.app.set('domain')});
};

/*
*    Navigate to a shortened link
*     Accepts a 6-32 alphanumeric get request: (http://srtlnk.com/{thisText})
*     Returns 302 redirect to either the original URL or back to homepage with an error
*    ALSO: Logs link navigation for stats
*/
Routes.prototype.navLink = function (req, res){
    var linkHash = req.params[0];
    //Is the linkHash ONLY alphanumeric and between 6-32 characters?
    if (shorten.isValidLinkHash(linkHash)){
        //Gather and clean the data required for logging this hash
        var ipaddress = req.connection.remoteAddress ? "0.0.0.0" : req.connection.remoteAddress;
        var referrer = req.header('Referrer') ? "" : req.header('Referrer');
        var userAgent = req.headers['user-agent'] ? "" : req.headers['user-agent'];
        //Here is the actual object that we will pass to the logger
        var userInfo = {
            'ip'       : sanitize(ipaddress),
            'userAgent': sanitize(userAgent),
            'referrer' : sanitize(referrer)
        };

        //Do we have that URL? If so, log it and send them
        shorten.linkHashLookUp(linkHash, userInfo, function(linkInfo, dbCursor){
            if (linkInfo !== false){
                //We know that hash, send them!
                //console.log("Linking user to: " + linkInfo.linkDestination);
                res.redirect(linkInfo.linkDestination);
            }else{
                linkHash = sanitize(linkHash);
                res.render('index', {errorMessage: 'No such link shortened with hash: \'' + linkHash + '\''});
            }
        });
    }
};

/*
*
* Set a new shortened link
*    Accepts a form-POST'd "originalURL" - the URL the user wants shortened.
*    Returns a json object with the shortened link information that looks like this:
*    {shortenError: false, alreadyShortened: false, originalURL: "http://derp.net", shortenedURL: "http://srtlnk.com/xxxxxx"}
*
*/
Routes.prototype.setLink = function (req, res){
    var shortenURL = req.body.originalURL;
    var domain = req.app.set('domain');
    var shortened = {
        shortenError: null, //false for no error, otherwise string with error
        alreadyShortened: null, //Boolean for if we already had this URL shortened
        originalURL: null, //the url we shortened
        shortenedURL: null //the full shortlink, including http://
    };
    if (!shortenURL){
        return res.status(400).json({"error": "Missing shortenedURL"});
    }

    //This is the URL we're shortening
    shortened.originalURL = shortenURL;

    //Make sure link mostly looks like a URL
    if (shorten.isURL(shortenURL, {"require_protocol": true}) === false){
        //Throw an error - not a real or supported URI
        log.debug(`Invalid or unsupported URI: ${shortenURL}`);
        shortened.shortenError = "Invalid or unsupported URI";
        res.status(400).json(shortened);
    }
    //Check to make sure we haven't already shortened this url
    shorten.originalURLLookUp(shortenURL, function(originalURLCheck){
        if (originalURLCheck === false){
            //Add to db
            shorten.addNewShortenLink(shortenURL, function(shortURL){
                shortened.shortenedURL = "http://" + domain + "/" + shortURL.linkHash;
                shortened.shortenError = false;
                shortened.alreadyShortened = false;
                res.json(shortened);
            });
        }else{
            //Give them the old hash
            shortened.shortenedURL = "http://" + domain + "/" + originalURLCheck.linkHash;
            shortened.shortenError = false;
            shortened.alreadyShortened = true;
            res.json(shortened);
        }
    });
};

/*
*
* Get info about a shortened link
*    Accepts a known short link form-POST'd "shortened_url" - eg ("http://srtlnk.com/yyyxxx")
*     Returns a json object with detailed stats and information
*
*/
Routes.prototype.getLink = function (req, res){
    var shortenedURL = req.body.shortenedURL;
    //Strip domain
    shortenedURL = shortenedURL.replace("http://" + req.app.set('domain') + "/", "");
    if (shorten.isValidLinkHash(shortenedURL)){
        //Get stats
        shorten.shortenedURLStats(shortenedURL, function(linkStats){
            //console.log("link stats");
            //console.log(linkStats);
            res.json(linkStats);
        });
    }else{
        //404 - no shortlink found with that hash
        var errorResponse ={
            'originalURL': null,
            'linkHash': null,
            'timesUsed': null,
            'lastUse': null,
            'topReferrals': {},
            'topUserAgents':{},
            'error': 'Not a URL we know, or not a valid shortened hash'
        };
        res.status(404).json(errorResponse);
    }
};

/*
/* Error handler
**/
Routes.prototype.errorHandler = function(err, req, res, next){
    var env = process.env.NODE_ENV;
    // respect err.status
    if (err.status) {
        res.statusCode = err.status;
    }
    // default status code to 500
    if (res.statusCode < 400) {
        res.statusCode = 500;
    }

    // write error to console
    if (env !== 'test') {
        if (res.statusCode !== 404){
            log.error(err.stack || JSON.stringify(err));
        }
    }

    // cannot actually respond
    if (res._header) {
        return req.socket.destroy();
    }

    // negotiate
    var accept = accepts(req);
    var type = accept.types('html', 'json', 'text');

    // Security header for content sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // html
    if (type === 'html') {
        if (res.statusCode === 404){
            log.info("404 :", req.url, " UA: ", req.headers["user-agent"], "IP: ", req.ip);
            return res.render("errors/404.html", {
                "http_status": res.statusCode,
                env
            });
        }
        var stack = (err.stack || '').split('\n').slice(1).map(function(v){ return '<li>' + escapeHtml(v).replace(/  /g, ' &nbsp;') + '</li>'; }).join('');
        res.render('errors/500.html', {
            "http_status": res.statusCode,
            error: String(err).replace(/  /g, ' &nbsp;').replace(/\n/g, '<br>'),
            showStack: stack,
            env
        });
    // json
    } else if (type === 'json') {
        var error = {error: true, message: err.message, stack: err.stack};
        for (var prop in err){
            if (err[prop]){
                error[prop] = err[prop];
            }
        }
        var json = JSON.stringify(error);
        res.setHeader('Content-Type', 'application/json');
        res.end(json);
    // plain text
    } else {
        res.setHeader('Content-Type', 'text/plain');
        res.end(err.stack || String(err));
    }
};

module.exports = Routes;
