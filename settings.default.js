exports.shorten_settings = {
    dev_domain: 'localhost:8888', // Your development domain
    live_domain: 'shrt.url', // Live domain
    dev_mongodb_uri: 'mongodb://localhost/shorten-node-dev',
    live_mongodb_uri: '' // Leave blank to automatically pickup MONGOLAB_URI
};


/*
*   Schema definition
*/
var Schema = require('mongoose').Schema;
// LinkStats is an embedded-document schema of LinkMaps
var LinkStats = new Schema();
LinkStats.add({
    ip: String,
    userAgent: String,
    referrer: String,
    timestamp: {type: Date, default: Date.now}
});

exports.models = {
    LinkMaps: new Schema({
        linkDestination: String,
        linkHash: String,
        timestamp: {type: Date, default: Date.now},
        linkStats: [LinkStats]
    })
};