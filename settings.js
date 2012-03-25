exports.shorten_settings = {
	dev_domain: 'localhost:8888', // Your development domain
	live_domain: 'kish.cm', // Live domain
	dev_mongodb_uri: 'mongodb://localhost/kishcm',
	live_mongodb_uri: 'mongodb://localhost/kishcm'
};


/*
*   Schema definitions
*/
var Schema = require('mongoose').Schema;
exports.models = {
	LinkMaps: new Schema({
	    linkDestination: String,
	    linkHash: String,
	    timestamp: {type: Date, default: Date.now}
	}),
	LinkStats: new Schema({
	    ip: String,
	    userAgent: String,
	    referrer: String,
	    timestamp: {type: Date, default: Date.now},
	    linkId_id: String // I get the impression this is 'relational thinking' - should this model be a ... 'sub-model' of LinkMaps?
	})
};

/*
// Would this work? Or be more efficient than above?

LinkMaps = new Schema({
    linkDestination: String,
    linkHash: String,
    timestamp: {type: Date, default: Date.now},
    linkStats: [new Schema({
			    ip: String,
			    userAgent: String,
			    referrer: String,
			    timestamp: {type: Date, default: Date.now}
			})]
})
*/