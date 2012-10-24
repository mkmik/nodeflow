'use strict';

var monitoring = require('./monitoring');
var Collector = require("./lib/Netflow");
var reloader = require('reloader');
var ip = require('./lib/ip');
var argv = require('optimist').argv;
var LRU = require("lru-cache");
var fork = require('child_process').fork;

var zmq = require('zmq')
  , sock = zmq.socket('push');

sock.bindSync('tcp://127.0.0.1:3412');
console.log('Producer bound to port 3412');

var port = argv.p || 9996;
var mon_port = argv.m || port+1;

var packetCount = 0;
var pdus = 0;
var byProto = {};

var exporters = {};


var child;
function spawnSub() {
    child = fork('./sub');
    child.on('exit', function (code) {
        console.log('sub process is dead' + code);

        spawnSub();
    });
}
spawnSub();

var app = new Collector(function (err) {
    if(err != null) {
        console.log("ERROR ERROR \n"+err);
    }
})
.on("listening",function() { console.log("listening", port); } )

.on("packet",function(nflow, rinfo) {
    packetCount++;
    pdus += nflow.v5Flows.length;

    if(pdus % 100 == 0)
        console.log("GOT PACKET:", packetCount, "PDU: ", pdus);

    var timestamp = nflow.header.unix_secs * 1000 + nflow.header.unix_nsecs / 1000000;

    var lastSequence = (exporters[rinfo.address] || {}).lastSequence || nflow.header.flow_sequence;
    var lostFrames = (exporters[rinfo.address] || {}).lostFrames || 0;
    var delta = nflow.header.flow_sequence - lastSequence - nflow.header.count;

    if(delta > 0)
        lostFrames += delta;

    exporters[rinfo.address] = { lastSequence: nflow.header.flow_sequence, lostFrames: lostFrames};

    nflow.v5Flows.forEach(function(raw) {
        byProto[raw.prot] = 1 + (byProto[raw.prot] || 0);

        if(raw.prot == 6)
            sock.send(JSON.stringify({raw:raw, timestamp:timestamp}));
    });

});

monitoring.app.get('/', function (req, res, next) {
    res.json({
        stats: {
            packetCount: packetCount,
            pdus: pdus,
            byProto: byProto
        },
        exporters: exporters
    });
});


if(argv.d) {
    reloader({
        watchModules: true,
        onReload: function () {
            app.listen(port);
            monitoring.listen(mon_port);
        }});
} else {
    app.listen(port);
    monitoring.listen(mon_port);
}
