/*
*   shorten-node - A URL Shortening web app
*    Andrew Kish, 2012
*/

var express = require('express'),
    // TODO: Update this when consolidate.js gets fixed
    swig = require('./consolidate-swig').swig, /* Extends dont work correctly in current version of consolidate */
    Routes = require('./routes'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    extras = require('express-extras'),
    settings = require('./settings').shorten_settings,
    models = require('./settings').models,
    site = module.exports = express();

//We pass Routes our entire app so it has access to the app context
var routes = new Routes(site);

/*
*
**  Configuration
*
*/
site.configure(function(){
    // Setup swig for Express 3.0 using consolidate, many other templates drop-in-able now!
    site.engine("html", swig);
    site.set("view engine", "html");
    site.set("view options", {layout: false});
    site.set("views", __dirname + "/views");

    //The rest of our static-served files
    site.use(express.static(__dirname + '/public'));

    //Middlewares
    site.use(extras.fixIP()); //Normalize various IP address sources to be more accurate
    site.use(extras.throttle({ //Simple throttle to prevent API abuse
        urlCount: 5,
        urlSec: 1,
        holdTime: 5,
        whitelist: {
        '127.0.0.1': true
        }
    }));
    site.use(express.bodyParser()); //Make use of x-www-form-erlencoded and json app-types
    site.use(express.methodOverride()); //Connect alias
    site.use(site.router);
    // Use our custom error handler
    site.use(routes.errorHandler);
});

/*
*
**  Sever specific configuration
*
*/
//Dev mode
site.configure('dev', function(){
    require('swig').init({ cache: false, allowErrors: true, root: __dirname + "/views",  filters: {} });
    //Set your domain name for your development environment
    site.set('domain', settings.dev_domain);
    site.use(express.logger('dev'));
    console.log("Running in dev mode");
    mongoose.connect(settings.dev_mongodb_uri);
    mongoose.model('LinkMaps', models.LinkMaps, 'linkmaps'); //models is pulled in from settings.json
    site.set('mongoose', mongoose);
    //site.use(express.errorHandler({ dumpExceptions: true, showStack: true}));
});
//Live deployed mode
site.configure('live', function(){
    require('swig').init({ cache: false, allowErrors: false, root: __dirname + "/views",  filters: {} });
    //Set your domain name for the shortener here
    site.set('domain', settings.live_domain);
    mongoose.connect(settings.live_mongodb_uri);
    mongoose.model('LinkMaps', models.LinkMaps, 'linkmaps'); //models is pulled in from settings.json
    site.set('mongoose', mongoose);
});


/*
*
**  Routes/Views
*
*/
site.get('/', routes.index);
site.get('/developers/', routes.developers);
site.post('/rpc/setLink', routes.setLink);
site.post('/rpc/getLink', routes.getLink);
site.get(/^\/([a-zA-Z0-9]{6,32})$/, routes.navLink);
//Catch all other attempted routes and throw them a 404!
site.all('*', function(req, resp, next){
    next({name: "NotFound", "message": "Oops! The page you requested doesn't exist","status": 404});
});

/*
*
**  Server startup
*
*/
//Forman will set the proper port for live mode (or set the environment variable PORT yourself), otherwise use port 8888
var port = process.env.PORT || 8888;
site.listen(port);
console.log("URL Shortener listening to http://" + site.set('domain') + " in %s mode", site.settings.env);
