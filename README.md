    __..         ,                    .
    (__ |_  _ ._.-+- _ ._  ___ ._  _  _| _ 
    .__)[ )(_)[   | (/,[ )     [ )(_)(_](/,

Shorten-node - A URL Shortener web app written in Node.js, with a MongoDB backend.

The app that powers my URL shortener "kish.cm" has come to represent a kind of "Hello world" for learning new languages and frameworks. This is my node.js powered version and is the version running on http://kish.cm that has been up and serving links and stats for over 3 years now.
This is my first project using Cassandra, and it is very much a learning experience. Please contact me if you see better ways of doing things, the whole point is to learn how Cassandra works.

Requirements:

* Node.js >= 0.10.x
* Cassandra >= 2.0.4
* Express = 3.x

What makes JavaScript development so awesome these days is the massive amount of awesome free things out there. This web app wouldn't be possible without making use of SO MUCH awesome stuff like:

* ExpressJS (http://expressjs.com/)
* mongoose (https://github.com/LearnBoost/mongoose)
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
* ZeroClipboard (http://code.google.com/p/zeroclipboard/)
* node-ams (https://github.com/kof/node-ams)

Probably also others I'm forgetting. The glue that holds this all together is what I wrote and it's licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php).

The front-end uses the django inspired templates package called swig. An asset manager build script is also included. It uses ams (https://github.com/kof/node-ams). If you plan to make front-end changes make sure to review the documentation there and edit build_assets.js as needed. There are some tests, but it is far from 100% test coverage (more like 20% coverage). Tests are written using nodeunit.

## To setup for local development

Edit settings.js to match your development and live configurations. You'll need a valid MongoDB URI and a domain for each.

Install dependencies

    npm install
    npm install -g bunyan
    npm install -g nodemon

Copy and setup local settings:

    cp settings.default.js settings.js
    # Setup your domain and mongodb server URI
    vim settings.js

Launch a dev server

    NODE_ENV=dev nodemon app.js | bunyan

The shortener will be available at http://localhost:8888/

Tests will only pass after shorten a URL and define `TEST_LINK_HASH` and `EXPECTED_ORIGINAL_URL` inside tests.js. Simply shorten a URL with your server and use those values to set the variables in tests.js properly.
After that you can run the tests like this (make sure your server is running!):

    sudo npm install -g nodeunit
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

    heroku create --stack cedar shortener-node --buildpack http://github.com/heroku/heroku-buildpack-nodejs.git

Setup Heroku to be our live app environment

    heroku config:add NODE_ENV=live --app shortener-node

Make sure the all the 'live' portions of settings.js is correctly filled out.
I used MongoLabs addon from Heroku: https://addons.heroku.com/mongolab but any MongoDB URI should do.

Make sure assets are compiled properly

    node build_assets.js

Don't forget to commit your changes

    git commit -am "Updated my MongoDB URIs and rebuilt assets."

If you use MongoLab addon ([free teir available](https://addons.heroku.com/mongolab#sandbox)), leave the `live_mongodb_uri` in `settings.js` as an empty string -- it will be picked up by shorten-node automatically. Using other services you can get the proper URI info by listing the config (replace 'shortener-node' with your app name) -- you will need to populate `live_mongodb_uri` in `settings.js` manually.
Once you've got your mongodb and domain settings changed, add it to your repo and commit the changes.

    # Be careful not to publish settings.js publically! Don't push this branch to your public github or bitbucket!
    git add settings.js
    git commit -am "Added my settings"

You should see: "NODE_ENV => live" part of the output of this command (replacing 'shortener-node' with the name of your app):

    heroku config --app shortener-node

You're probably not going to want to use their placeholder domain. Replace kish.cm with the domain of your shortener (and [set your domain up to point to this app properly](https://devcenter.heroku.com/articles/custom-domains))

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
