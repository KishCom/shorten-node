    __..         ,                    .
    (__ |_  _ ._.-+- _ ._  ___ ._  _  _| _
    .__)[ )(_)[   | (/,[ )     [ )(_)(_](/,

Shorten-node - A URL Shortener web app written in Node.js, with a MongoDB backend.

This URL shortener app has been running for over 6 years. A testament to how far Node.js has come.

When I started this project I didn't know much about MongoDB, however over the course of a few years it's easy to see how I would have done things differently (eg: probably used PostgresQL instead 😏). However, it's not broken yet so I'm not going to rewrite things -- it works well on the scale I use it.

What makes JavaScript development so awesome these days is the massive amount of awesome free things out there. This web app wouldn't be possible without making use of SO MUCH awesome stuff like:

* ExpressJS (http://expressjs.com/)
* mongoose (https://github.com/LearnBoost/mongoose)
* LessCSS (http://lesscss.org/)
    - Less Elements (http://lesselements.com/)
    - Semantic.gs (http://semantic.gs/)
* Nunjucks templates (https://mozilla.github.io/nunjucks/)
* nodeunit (https://github.com/caolan/nodeunit)
* Clipboard.js (https://clipboardjs.com/)
* And Heroku for hosting of course!

Probably also others I'm forgetting. The glue that holds this all together is what I wrote and it's licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php).

The front-end uses the django inspired templates package called [nunjucks](https://mozilla.github.io/nunjucks/). An asset manager build script is also included. It uses grunt (http://gruntjs.com/). If you plan to make front-end changes make sure to review the documentation there and run the Gruntfile as needed. There are some tests, but it is far from 100% test coverage (more like 20% coverage). Tests are written using nodeunit.

A note on [web scale](http://mongodb-is-web-scale.com/): The way this is configured to work with MongoDB is that all logs for a given shortened URL live in the same single MongoDB document. For this simple project it's fine. However, if for some reason this project were to be deployed on a very large scale, things would break down quite quickly. Mainly: the size of a single shortened URL document from MongoDB could aquire enough log entries to exceed [MongoDB document limit size](http://www.mongodb.org/display/DOCS/Documents#Documents-MaximumDocumentSize) - and things would be very slow as it approched this limit. While I don't have benchmarks, I'm sure for a dozen or so users using normal volumed twitter accounts, it's more than adequate (at least a few thousand uses/logs per hash before you even need to start to thinking about this).

## To setup for local development

Edit settings.js to match your development and live configurations. You'll need a valid MongoDB URI and a domain for each.

Install dependencies

    npm install

Copy and setup local settings:

    cp settings.default.js settings.js
    # Setup your domain and mongodb server URI
    vim settings.js

Launch a dev server

    npm start

The shortener will be available at http://localhost:8888/

You can run the tests simply with:

    npm test

### To test live server mode (compile + minify CSS/JS)


Rebuild assets and launch a live server:

    npm run start.live

## To deploy to live using Heroku:

Make sure you're in the shortening apps git repo directory, or clone it from somewhere else

    git clone git@github.com:KishCom/shorten-node.git

Login/signup at heroku

    heroku login

Create a new app, sub in your prefered app name in place of 'supertestshorten' (from here on).

    heroku apps:create supertestshorten -b heroku/nodejs

Create a sandbox MLab MongoDB (you'll need to have a 'verified' Heroku account for this)

    heroku addons:create mongolab:sandbox --app supertestshorten

Setup Heroku to be our live app environment

    heroku config:add NODE_ENV=live --app supertestshorten

Make sure the all the 'live' portions of settings.js is correctly filled out:

    cp settings.default.js settings.js
    # Edit settings.js with your settings, proabably just the domain will do

Make sure assets are compile properly

    grunt

If you use MongoLab addon ([free teir available](https://addons.heroku.com/mongolab#sandbox)), leave the `live_mongodb_uri` in `settings.js` as an empty string -- it will be picked up by shorten-node automatically. Using other services you can get the proper URI info by listing the config (replace 'supertestshorten' with your app name) -- you will need to populate `live_mongodb_uri` in `settings.js` manually.
Once you've got your mongodb and domain settings changed, add it to your repo and commit the changes.

    # Be careful not to publish settings.js publically! Don't push this branch to your public github or bitbucket!
    git add settings.js
    git commit -am "Added my settings"

You should see: "NODE_ENV => live" part of the output of this command (replacing 'supertestshorten' with the name of your app):

    heroku config --app supertestshorten

You're probably not going to want to use their placeholder domain. Replace kish.cm with the domain of your shortener (and [set your domain up to point to this app properly](https://devcenter.heroku.com/articles/custom-domains))

    # Skip this step if you don't want to use the default heroku domain: supertestshorten.herokuapp.com
    heroku domains:add yourawesomedomain.com

Finally, push the repo to heroku, if everything is working your app is now deployed and live!

    git push heroku master

## To update your app running on heroku

Get a copy of the current running app (replace 'supertestshorten' with your app name)

    git clone git@heroku.com:supertestshorten.git -o heroku

Make edits to the app as you need (replace 'supertestshorten' with your app name)
cd supertestshorten

    #edit some stuff

Commit your changes and add a message

    git commit -a -m "Updated widgets to be more widgety"

Push changes to live server

    git push heroku master
