/*
*
*   mysql2mongo.js
*       A tool for migrating the shorten-node web app from MySQL to MongoDB
*
*   Probably pretty ugly to someone who has done this kind of thing before, but it gets the job done and I learned quite a bit.
*   
*   Don't forget to update your mongoose.connect URI and mysql.createClient credentials 
*   USAGE: 
*       node mysql2mongo.js
*       (will not exit on its own, too lazy to write process.end(1) in a callback --- CTRL+C when you see log activity cease [super-hacky-fun-times!])
*
*
*
*   Once completed compare your outputs:
*   curl -d "shortenedURL=xxxYYY" http://yourmysqlserver.com/rpc/getLink
*   vs
*   curl -d "shortenedURL=xxxYYY" http://yourmongodbserver.com/rpc/getLink
*
*   Get fancy and test your migrations with a long bash command:
*     - Replace "kish.cm" and "dev.kish.cm" with your domains
*     - also replace xxxYYY with a known short-link hash from your database
*
*         curl -d "shortenedURL=xxxYYY" http://kish.cm/rpc/getLink | python -mjson.tool > live.tmp; curl -d "shortenedURL=xxxYYY" http://dev.kish.cm/rpc/getLink | python -mjson.tool > dev.tmp; diff live.tmp dev.tmp; rm -f {live.tmp,dev.tmp};
*/



var mongoose = require('mongoose'),
	mysql = require('node-mysql'), // Hey - make sure this is *your* version (https://github.com/KishCom/node-mysql)
    time = require('time');

var Schema = require('mongoose').Schema;
// LinkStats is a sub-schema of LinkMaps
var LinkStats = new Schema();
LinkStats.add({
    ip: String,
    userAgent: String,
    referrer: String,
    timestamp: {type: Date, default: Date.now},
});

var LinkMaps = new Schema({
    linkDestination: String,
    linkHash: String,
    timestamp: {type: Date, default: Date.now},
    linkStats: [LinkStats]
});

mongoose.connect("mongodb://mongoserver.com/mongodb_name");
var linkMapsCursor = mongoose.model('LinkMaps', LinkMaps);
var mysqlc = mysql.createClient({host: "localhost", user: "mysqluser", password: "mysqlpassword", database: "shorten_node", port: '3306'});

mysqlc.query("SELECT * FROM `shorten_linkmaps` ORDER BY `id` DESC", function(err, results, fields){
    if (err === null){
        if (results.length > 0){
            var mapOfMongoMaps = [];
            for (var i = 0; results.length > i; i++){
                if (results[i]){
                    //Each row, create a new document in Mongo
                    console.log("Fetched id " + results[i].id + " from mysql.");

                    var properTimestamp = new time.Date(results[i].timestamp);
                    properTimestamp.setTimezone("UTC", true);
                    // Create the new object
                    var newMongoMap = new linkMapsCursor({ linkDestination: results[i].linkDestination,
                                                           linkHash: results[i].linkHash,
                                                           timestamp: properTimestamp});
                    mapOfMongoMaps.push({'linkId': results[i].id, 'mongomap': newMongoMap});
                    //Now get the stats
                    mysqlc.query("SELECT * FROM `shorten_linkstats` WHERE `linkId_id` = '" + results[i].id + "'", function(err, results, fields, sqlQuery){
                        var knownId = sqlQuery.match("[0-9]+")[0];
                        //console.log("ID appears to be: "+knownId);
                        console.log("Found " + results.length + " stats for link hash: " + knownId);
                        var saveThisMap;
                        //Find the mongomap these stats belong to:
                        for (var a = 0; mapOfMongoMaps.length > a; a++){
                            if (mapOfMongoMaps[a].linkId == knownId){
                                //Now save the mongodb document
                                saveThisMap = mapOfMongoMaps[a].mongomap;
                            }
                        }
                        if (results.length > 0){
                            //Attach each stat to the monogodb linkmap instance
                            for (var a = 0; results.length > a; a++){
                                // ...as an embedded-document
                                //console.log(results[a].id);
                                var aproperTimestamp = new time.Date(results[a].timestamp);
                                aproperTimestamp.setTimezone("UTC", true);
                                saveThisMap.linkStats.push({ip: results[a].ip, userAgent: results[a].userAgent, referrer: results[a].referrer, timestamp: aproperTimestamp}); 
                            }
                        }
                        saveThisMap.save();
                    });
                }
            }
            return false;
        }else{
            return results[0];
        }
    }else{
        console.log("Some SQL error:");
        console.log(err);
        return false;
    }
});
