'use strict';

var Collector = require("Netflow");
var reloader = require('reloader');
var ip = require('./lib/ip');
var argv = require('optimist').argv;
var LRU = require("lru-cache");

var potentialConnections = LRU({
    max: 500000,
    maxAge: 1000 * 600
});

var port = argv.p || 9996;


var app = new Collector(function (err) {
    if(err != null) {
        console.log("ERROR ERROR \n"+err);
    }
})
.on("listening",function() { console.log("listening", port); } )

.on("packet",function(nflow) {
    nflow.v5Flows.forEach(function(raw) {
        var packet = ip.parsePacket(raw);
//        if(packet && (packet.src == '146.48.122.92' | packet.dst == '146.48.122.92')) {
        if(packet) {
//            console.log("GOT PACKET FROM MYSELF", packet.isStartOfConnection, packet.flags, '0x' + packet.rawFlags.toString(16));

            if(packet.isStartOfConnection) {
                var key = packet.dstEndpoint();
                potentialConnections.set(key, packet);

//                console.log("added to cache", key);
//                console.log("got potential start of connection. Waiting for", key);
            } else if(packet.isAckOfConnection) {
                var key = packet.srcEndpoint();
                var orig = potentialConnections.get(key);
//                console.log("checking cache", key, orig);
                if(orig) {
                    console.log("got connection established", orig);
}
            }
        } else {
//            console.log("unhandled ip packet", raw);
        }
    });
});

if(argv.d) {
    reloader({
        watchModules: true,
        onReload: function () {
            app.listen(port);
        }});
} else {
    app.listen(port);
}

