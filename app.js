/*
*   shorten-node - A URL Shortening web app
*    Andrew Kish, 2014 - 2020
*/

var express = require('express'),
    nunjucks = require("nunjucks"),
    Routes = require('./routes'),
    mongoose = require('mongoose'),
    extras = require('express-extras'),
    cookieParser = require("cookie-parser"),
    bodyParser = require("body-parser"),
    expressSession = require("express-session"),
    settings = require('./settings').shorten_settings,
    lessMiddleware = require("less-middleware"),
    models = require('./settings').models,
    bunyan = require("bunyan"), log,
    site = module.exports = express();

var packagejson = require('./package');
if (process.env.NODE_ENV === "dev" || process.env.NODE_ENV === "live" || process.env.NODE_ENV === "test"){
    settings.NODE_ENV = process.env.NODE_ENV;
    settings.appName = packagejson.name;
    settings.appVersion = packagejson.version;
    site.locals.settings = settings;
}else{
    console.fatal("Missing NODE_ENV environment variable. Must be set to 'dev', 'test', or 'live'.");
    process.exit(-1);
}

//LESS compiler middleware, if style.css is requested it will automatically compile and return style.less
site.use(lessMiddleware(__dirname + "/public"));

nunjucks.configure('views', {
    autoescape: true,
    express: site
});
site.set("view engine", "html");
site.set("views", __dirname + "/views");

//The rest of our static-served files
site.use(express.static(__dirname + '/public'));

//Middlewares
site.use(extras.fixIP()); //Normalize various IP address sources to be more accurate
if (settings.NODE_ENV !== "test"){
    site.use(extras.throttle({ //Simple throttle to prevent API abuse
        urlCount: 5,
        urlSec: 1,
        holdTime: 5,
        whitelist: {
            '127.0.0.1': true,
            'localhost': true,
            '192.168.2.99': true // You'll want to whitelist any testing servers
        }
    }));
}

site.use(bodyParser.urlencoded({extended: true}));
site.use(bodyParser.json());
site.use(cookieParser());
site.use(expressSession({
    secret: settings.sessionSecret,
    key: packagejson.name + ".sid",
    saveUninitialized: false,
    resave: false,
    cookie: {
        maxAge: 2592000 * 1000, // 30 days in ms
        path: '/',
        secure: (settings.NODE_ENV === "live"),
        domain: settings.NODE_ENV === "live" ? settings.live_domain : settings.dev_domain
    }
}));

// Configure logging
log = bunyan.createLogger({name: "shorten-node",
    streams: [{
        level: "trace", // Priority of levels looks like this: Trace -> Debug -> Info -> Warn -> Error -> Fatal
        stream: process.stdout, // Developers will want to see this piped to their consoles
    }]});
site.set('bunyan', log);

/*
**  Sever specific configuration
*/
//Dev mode
if (settings.NODE_ENV === "dev"){
    //Set your domain name for your development environment
    site.set('domain', settings.dev_domain);
    log.debug("Running in dev mode");
    mongoose.connect(settings.dev_mongodb_uri, {useNewUrlParser: true, useUnifiedTopology: true});
}else if (settings.NODE_ENV === "test"){
    //Set your domain name for your development environment
    site.set('domain', settings.dev_domain);
    log.debug("Running in test mode");
    mongoose.connect(settings.test_mongodb_uri, {useNewUrlParser: true, useUnifiedTopology: true});
}else if (settings.NODE_ENV === "live"){
    //Set your domain name for the shortener here
    site.set('domain', settings.live_domain);
    mongoose.connect(settings.live_mongodb_uri === '' ? process.env.MONGODB_URI : settings.live_mongodb_uri, {useNewUrlParser: true, useUnifiedTopology: true});
}else{
    log.fatal("NODE_ENV not set, or not set properly.");
    process.end(-1);
}
mongoose.model('LinkMaps', models.LinkMaps, 'linkmaps'); //models is pulled in from settings.json
site.set('mongoose', mongoose);

/*
**  Routes/Views
*/
//We pass Routes our entire app so it has access to the app context
var routes = new Routes(site);

// Here are all our routes
site.get('/', routes.index);
site.get('/developers/', routes.developers);
site.post('/rpc/setLink', routes.setLink);
site.post('/rpc/getLink', routes.getLink);
site.get(/^\/([a-zA-Z0-9]{6,32})$/, routes.navLink);
//Catch all other attempted routes and throw them a 404!
site.all('*', function(req, resp, next){
    next({name: "NotFound", "message": "Oops! The page you requested doesn't exist", "status": 404});
});
// Use our custom error handler
site.use(routes.errorHandler);

/*
**  Server startup
*/
// Use port 8888 or a provided PORT environment variable
var port = process.env.PORT || 8888;
site.listen(port, () => log.info("URL Shortener listening to http://" + site.set('domain') + " in %s mode", site.settings.env));
