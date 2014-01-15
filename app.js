/*
*   shorten-node - A URL Shortening web app
*    Andrew Kish, 2014
*/

var express = require('express'),
    cons = require('consolidate'),
    Routes = require('./routes'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    extras = require('express-extras'),
    settings = require('./settings').shorten_settings,
    lessMiddleware = require("less-middleware"),
    models = require('./settings').models,
    bunyan = require("bunyan"), log,
    site = module.exports = express();

/*
**  Configuration
*/
site.configure(function(){
    //LESS compiler middleware, if style.css is requested it will automatically compile and return style.less
    site.use(lessMiddleware({
        src: __dirname + "/public",
        compress: true
    }));
    // Setup swig for Express 3.0 using consolidate, many other templates drop-in-able now!
    site.engine("html", cons.swig);
    site.set("view engine", "html");
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
    // Configure logging
    log = bunyan.createLogger({ name: "shorten-node",
    streams: [
    {
        level: "trace", // Priority of levels looks like this: Trace -> Debug -> Info -> Warn -> Error -> Fatal
        stream: process.stdout, // Developers will want to see this piped to their consoles
    }/*,{
        level: 'warn',
        stream: new utils(), // looks for 'write' method. https://github.com/trentm/node-bunyan
    }*/
    ]});
    site.set('bunyan', log);
});

/*
**  Sever specific configuration
*/
//Dev mode
site.configure('dev', function(){
    //Set your domain name for your development environment
    site.set('domain', settings.dev_domain);
    console.log("Running in dev mode");
    mongoose.connect(settings.dev_mongodb_uri);
    mongoose.model('LinkMaps', models.LinkMaps, 'linkmaps'); //models is pulled in from settings.json
    site.set('mongoose', mongoose);
});
//Live deployed mode
site.configure('live', function(){
    //Set your domain name for the shortener here
    site.set('domain', settings.live_domain);
    mongoose.connect(settings.live_mongodb_uri);
    mongoose.model('LinkMaps', models.LinkMaps, 'linkmaps'); //models is pulled in from settings.json
    site.set('mongoose', mongoose);
});


/*
**  Routes/Views
*/
//We pass Routes our entire app so it has access to the app context
var routes = new Routes(site);
// Setup the router
site.use(site.router);
// Use our custom error handler
site.use(routes.errorHandler);
// Here are all our routes
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
**  Server startup
*/
//Forman will set the proper port for live mode (or set the environment variable PORT yourself), otherwise use port 8888
var port = process.env.PORT || 8888;
site.listen(port);
console.log("URL Shortener listening to http://" + site.set('domain') + " in %s mode", site.settings.env);
