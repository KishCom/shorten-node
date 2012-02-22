    __..         ,                    .    
    (__ |_  _ ._.-+- _ ._  ___ ._  _  _| _ 
    .__)[ )(_)[   | (/,[ )     [ )(_)(_](/,

Shorten-node - A URL Shortener web app written in Node.js, with a MySQL backend.

The app that powers my URL shortener "kish.cm" has come to represent a kind of "Hello world" for learning new languages and frameworks. This is my node.js powered version and is the version running on http://kish.cm (current as of time of writing).

I keep using MySQL only because that's what the original shortening app used when it was built in PHP almost 6 years ago. I am planning to move to a nosql style DB sometime in the future.

Requirements:	

* Node.js >= 0.6.5
* npm >= 1.0.0
* MySQL 5

What makes JavaScript development so awesome these days is the sheer massive amount of awesome free things out there. This web app wouldn't be possible without making use of SO MUCH awesome stuff like:

* ExpressJS (http://expressjs.com/)
* LessCSS (http://lesscss.org/)
    - Less Elements (http://lesselements.com/)
    - Semantic.gs (http://semantic.gs/)
* Swig templates (http://paularmstrong.github.com/swig/)
* EnderJS (http://ender.no.de/)
	- jeesh (domready, bean, qwery, bonzo) https://github.com/ender-js/jeesh
	- reqwest (https://github.com/ded/reqwest)
	- ender-overlay (https://github.com/nemeseri/ender-overlay)
	- morpheus (https://github.com/ded/morpheus)
* node-validator (https://github.com/chriso/node-validator)
* nodeunit (https://github.com/caolan/nodeunit)
* express-extras (https://github.com/davglass/express-extras)
* node-mysql (https://github.com/felixge/node-mysql)
* ZeroClipboard (http://code.google.com/p/zeroclipboard/)
* node-ams (https://github.com/kof/node-ams)

Probably also others I'm forgetting. The glue that holds this all together is what I wrote and it's licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php).

The front-end uses the django inspired templates package called swig. An asset manager build script is also included. It uses ams (https://github.com/kof/node-ams). If you plan to make front-end changes make sure to review the documentation there and edit build_assets.js as needed. There are some tests, but it is far from 100% test coverage (more like 20% coverage). Tests are written using nodeunit.


## To setup for local development

Edit settings.js to match your development and live configurations. You'll need standard MySQL creds and a domain for each.

Install dependencies

    npm install -d

To setup the initial database structure either manually load the SQL inside of setup_db.js or simply run:

    node setup_db.js dev

Launch a dev server

    NODE_ENV=dev node app.js

The shortener will be available at http://localhost:8888/

With your server still running run the tests (update DEV_SERVER_HOST, DEV_SERVER_PORT in tests.js if you need to)

    nodeunit tests.js


### To test live server mode (compile + minify CSS/JS)


Rebuild assets and launch a live server:

    node build_assets.js
    NODE_ENV=live node app.js 


## To deploy to live using Heroku:


Make sure you're in the shortening apps git repo directory, or clone it from somewhere else

    git clone ... #cloned in from somewhere else
    ## OR if you have code exported from somewhere else
    git init; git add .; git commit -m "inital commit from a brand new git repo"

Login/signup at heroku

    heroku login

Create a new app on cedar, sub in your prefered app name in place of 'shortener-node' (from here on).

    heroku create --stack cedar shortener-node --buildpack http://github.com/liquid/heroku-buildpack-nodejs.git

Setup Heroku to be our live app environment

    heroku config:add NODE_ENV=live --app shortener-node

Make sure the live_mysql portion of settings.js is correctly filled out.
I used ClearDB MySQL Database addon from Heroku: https://addons.heroku.com/cleardb but any mysql DB that accepts remote connections will do.
Make sure the initial database structure is setup by either manually loading the SQL inside of setup_db.js or simply running:

    node setup_db.js live

Make sure assets are compiled properly

    node build_assets.js

Don't forget to commit your changes

    git commit -a -m "Updated my MySQL hosts information and rebuilt assets."

If you use ClearDB addon you can get the mysql info by listing the config (replace 'shortener-node' with your app name)
You should also see: "NODE_ENV => live"

    heroku config --app shortener-node

 You're probably not going to want to use their domain

    heroku addons:add custom_domains

Replace kish.cm with the domain of your shortener (and set your domain up to point to this app properly)

    heroku domains:add kish.cm

Finally, push the repo to heroku, if everything is working your app is now deployed and live!

    git push heroku master


## To update your app running on heroku

Get a copy of the current running app (replace 'shortener-node' with your app name)

    git clone git@heroku.com:shortener-node.git -o heroku

Make edits to the app as you need (replace 'shortener-node' with your app name)
cd shortener-node

    #edit some stuff

Commit your changes and add a message

    git commit -a -m "Updated widgets to be more widgety"

Push changes to live server

    git push heroku master