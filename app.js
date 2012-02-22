/*
*   shorten-node - A URL Shortening web app
*    Andrew Kish, Feb 2012
*/

var express = require('express'),
    swig = require('swig'),
    Routes = require('./routes'),
    mysql = require('mysql'),
    extras = require('express-extras'),
    settings = require('./settings').shorten_settings,
    site = module.exports = express.createServer();

//We pass Routes our entire app so it has access to the app context
var routes = new Routes(site);
var mysqlc;

/*
*
**  Configuration
*
*/
site.configure(function(){
    //Setup views and swig templates
    swig.init({root: __dirname + '/views', allowErrors: true});
    //Configure Express to use swig
    site.set('views', __dirname + '/views');
    site.set('view engine', 'html');
    site.register('.html', require('swig'));
    site.set('view cache', true);
    site.set('view options', {layout: false}); //For extends and block tags in swig templates
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
});

/*
*
**  Sever specific configuration
*
*/
//Dev mode
site.configure('dev', function(){
    //Set your domain name for your development environment
    site.set('domain', settings.dev_domain);
    //LESS compiler middleware, if style.css is requested it will automatically compile and return style.less
    site.use(express.compiler({ src: __dirname + '/public', enable: ['less']}));
    site.use(express.logger('dev'));
    console.log("Running in dev mode");
    //Update with your local mysql information
    mysqlc = mysql.createClient({host: settings.dev_mysql.host, user: settings.dev_mysql.user, password: settings.dev_mysql.password, database: settings.dev_mysql.dbname});
    site.set('mysqlc', mysqlc);
    site.use(express.errorHandler({ dumpExceptions: true, showStack: true}));
});
//Live deployed mode
site.configure('live', function(){
    //Set your domain name for the shortener here
    site.set('domain', settings.live_domain);
    //Update with your live MySQL information
    mysqlc = mysql.createClient({host: settings.live_mysql.host, user: settings.live_mysql.user, password: settings.live_mysql.password, database: settings.live_mysql.dbname});
    site.set('mysqlc', mysqlc);
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
site.all(/^\/([a-zA-Z0-9]{6,32})$/, routes.navLink);
//Anything else anyone tries should be a 404, keep this last:
site.get('*', function(){
    throw new Error('404 Totally not even found anywhere');
});
site.post('*', function(){
    throw new Error('404 Totally not even found anywhere');
});
//Custom error handling function, setup to use our error view
site.use(function(err, req, res, next){
    var stackTrace = Error.captureStackTrace(this, arguments.callee);
    var now = new Date();
    var errorTime = now.getDate() + "/" + (now.getMonth()+1) + "/" + now.getFullYear() + " - " + now.getHours() + ":" + now.getMinutes();
    console.log(errorTime + " :: " + req.url + " " + err );
    res.render('error', { 'errorBlock': err, 'stackTrace': stackTrace });
});

/*
*
**  Server startup
*
*/
//Forman will set the proper port for live mode, otherwise use port 8888
var port = process.env.PORT || 8888;
site.listen(port);
console.log("URL Shortener listening to http://" + site.set('domain') + " on port %d in %s mode", site.address().port, site.settings.env);
