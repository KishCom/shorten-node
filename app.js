/*
*   shorten-node - A URL Shortening web app
*    Andrew Kish, 2012-2014
*/

var express = require('express'),
    cons = require('consolidate'),
    Routes = require('./routes'),
    helenus = require('helenus'),
    cassPool, // Pool of Cassandra connections
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
    site.use(extras.fixIP(['HTTP-X-REAL-IP','X-REAL-IP'])); //Normalize various IP address sources to be more accurate
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
    site.set('helenus', helenus);
    cassPool = new helenus.ConnectionPool({
        hosts      : settings.dev_cassandra_host,
        keyspace   : 'shorten_node',
        //user       : settings.dev_cassandra_user, // TBD
        //password   : settings.dev_cassandra_pass, // TBD
        timeout    : 3000,
        cqlVersion : '3.0.0'
    });
    cassPool.on('error', function(err){
        console.error(err.name, err.message);
    });
    cassPool.connect(function(err, keyspace){
        if(err){
            console.log("Double check: Your host name and port, and that your keyspace exists.");
            throw(err);
        } else {
            site.set("cassandra", cassPool);
        }
    });
    //site.use(express.errorHandler({ dumpExceptions: true, showStack: true}));
});
//Live deployed mode
site.configure('live', function(){
    //Set your domain name for the shortener here
    site.set('domain', settings.live_domain);
    site.set('helenus', helenus);
    cassPool = new helenus.ConnectionPool({
        hosts      : settings.live_cassandra_host,
        keyspace   : 'linkmaps',
        //user       : settings.live_cassandra_user, // TBD
        //password   : settings.live_cassandra_pass, // TBD
        timeout    : 3000,
        cqlVersion : '3.0.0'
    });
    cassPool.on('error', function(err){
        console.error(err.name, err.message);
    });
    cassPool.connect(function(err, keyspace){
        if(err){
            throw(err);
        } else {
            site.set("cassandra", cassPool);
        }
    });
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

site.get('/cassandra', function(req, res, next){
    var cass = site.get('cassandra');
    cass.cql('SELECT * FROM linkmaps WHERE "linkDestination" = ?', ["http://viafourous.com"], function(err, results){
        if (err){
            console.log(err);
        }else{
            
            // Check to make sure we have the URL on file
            if (results.length > 0){
                console.log(results);
                res.json(results);
            }else{
                // We don't have a shortened URL withthat hash
                console.log("NotFound");
                res.json({"error": "not found"});
            }
        }
    });
});

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
