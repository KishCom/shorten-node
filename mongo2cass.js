// Make sure you've got a table ready for this in Cassandra:
/*

# run cqlsh and enter this:

CREATE KEYSPACE shorten_node WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};
CREATE TABLE shorten_node.linkmaps (
  "linkHash" text PRIMARY KEY,
  "linkDestination" text,
  "timestamp" timestamp
) WITH
  bloom_filter_fp_chance=0.010000 AND
  caching='KEYS_ONLY' AND
  comment='' AND
  dclocal_read_repair_chance=0.000000 AND
  gc_grace_seconds=864000 AND
  read_repair_chance=0.100000 AND
  replicate_on_write='true' AND
  populate_io_cache_on_flush='false' AND
  compaction={'class': 'SizeTieredCompactionStrategy'} AND
  compression={'sstable_compression': 'SnappyCompressor'};
CREATE INDEX linkmaps_linkDestination_idx ON shorten_node.linkmaps ("linkDestination");


*/
// Next make sure that your tables are setup in acunu properly (import acunu_tables.json from this repo to your acunu setup)
// Then run this converter!

var mongodbURI = "";
var cassandra_host = ["localhost:9160"];
var acunu_uri = "http://localhost:8080/analytics/api/data/LinkStats";

// Setup MongoDB Stuff
var mongoose = require('mongoose');
mongoose.connect(mongodbURI);
var Schema = require('mongoose').Schema;
var models = {LinkMaps: new Schema({
                linkDestination: String,
                linkHash: String,
                timestamp: {type: Date, default: Date.now},
                linkStats: [LinkStats]
            })};
var LinkStats = new Schema();
LinkStats.add({
    ip: String,
    userAgent: String,
    referrer: String,
    timestamp: {type: Date, default: Date.now}
});
//mongoose.model('LinkStats', models.LinkStats, 'linkstats');
var LinkMaps = mongoose.model('LinkMaps', models.LinkMaps, 'linkmaps');


// Setup Cassandra Stuff
var acuReq = require('request');
var helenus =   require('helenus'),
                cass; // Pool of Cassandra connections
cassPool = new helenus.ConnectionPool({
    hosts      : cassandra_host,
    keyspace   : 'shorten_node',
    //user       : settings.dev_cassandra_user, // TBD
    //password   : settings.dev_cassandra_pass, // TBD
    timeout    : 3000,
    cqlVersion : '3.0.0'
});
cassPool.on('error', function(err){
    console.error(err.name, err.message);
    process.exit();
});
cassPool.connect(function(err, keyspace){
    if(err){
        console.log("Double check: Your host name and port, and that your keyspace exists.");
        throw(err);
        process.exit();
    }
});


// Get from MongoDB
var stream = LinkMaps.find().stream();
var crypto = require('crypto');
stream.on('data', function (doc) {
    // do something with the mongoose document
    /*
   // doc looks like this:
          { __v: 1,
          _id: 512e781007db380200000002,
          linkDestination: 'http://fiavoura.com',
          linkHash: '095n7s',
          linkStats:
           [ { _id: 512e781d07db380200000003,
               timestamp: Wed Feb 27 2013 21:18:21 GMT+0000 (UTC),
               referrer: '',
               userAgent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:19.0) Gecko/20100101 Firefox/19.0',
               ip: '10.145.153.252' } ],
          timestamp: Wed Feb 27 2013 21:18:08 GMT+0000 (UTC) }
    */
    console.log("Importing shortlink: " + doc.linkHash);
    var hashUnixtime = new Date(doc.timestamp).getTime();
    cassPool.cql('INSERT INTO linkmaps ("linkHash", "linkDestination", "timestamp") VALUES (?, ?, ?)', [doc.linkHash, doc.linkDestination, hashUnixtime ], function(err, result){
        if (err){
            console.log(err);
        }else{
            // Insert was good!
            console.log("Imported: " + doc.linkHash + " to Cassandra");
        }
    });

    // Loop over all the stats and push them into acunu
    var completed = 0;
    var cnt = 0;
    var totalExpected = 0;
    for (var dracula = 0, allStatsCnt = doc.linkStats.length; allStatsCnt > dracula; dracula++){
        cnt++;
        var stat = doc.linkStats[dracula];
        stat.fingerprint = crypto.createHash('md5').update((stat.ip + stat.userAgent)).digest("hex");
        stat.timestamp = new Date(stat.timestamp).getTime();
        var linkStats = {   "linkHash": doc.linkHash,
                            "linkDestination": doc.linkDestination,
                            "ip": stat.ip,
                            "referrer": stat.referrer,
                            "userAgent": stat.userAgent,
                            "fingerprint": stat.fingerprint,
                            "timestamp": stat.timestamp
                };
        console.log("Firing off stat " + cnt + " linkhash: " + doc.linkHash);
        totalExpected = totalExpected + doc.linkStats.length;
        acuReq({uri: acunu_uri,
            body: JSON.stringify(linkStats),
            method: "POST"},    
            function(e, r, body){
                completed++;
                if (e){
                    console.log("Error logging to acunu:");
                    console.log(e);
                }else{
                    console.log("Completed " + completed + " of expected " + totalExpected);
                }
            }
        );
    }
  
  console.log("-----------------------------------------------------------------------");
  console.log("-----------------------------------------------------------------------");
  console.log("-----------------------------------------------------------------------");
}).on('error', function (err) {
  console.log(err);
  console.log("Xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  console.log("Xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  console.log("Xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
}).on('close', function () {
  console.log("---------");
  console.log("The stream is closed");
});

/*
// Insert into Cassandra
cass.cql('INSERT INTO linkmaps ("linkHash", "linkDestination", "timestamp") VALUES (?, ?, ?)', ["x1y1b2", "http://example.com", curUnixtime ], function(err, result){
    if (err){
        console.log(err);
        res.json(err);
    }else{
        // Insert was good!
    }
});
// and all the stats events into Acuntu...

*/