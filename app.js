'use strict';

var monitoring = require('./monitoring');
var Collector = require("Netflow");
var reloader = require('reloader');
var ip = require('./lib/ip');
var argv = require('optimist').argv;
var LRU = require("lru-cache");
var redis = require("redis");

var db = LRU({
    max: 500000,
    maxAge: 1000 * 600
});

var rclient = redis.createClient();

rclient.on("error", function (err) {
    console.log("Redis error " + err);
});


var port = argv.p || 9996;
var mon_port = argv.m || port+1;

var packetCount = 0;
var pdus = 0;
var byProto = {};

var app = new Collector(function (err) {
    if(err != null) {
        console.log("ERROR ERROR \n"+err);
    }
})
.on("listening",function() { console.log("listening", port); } )

.on("packet",function(nflow) {
    packetCount++;
    pdus += nflow.v5Flows.length;

    if(pdus % 100 == 0)
        console.log("GOT PACKET:", packetCount, "PDU: ", pdus);

    var timestamp = nflow.header.unix_secs * 1000 + nflow.header.unix_nsecs / 1000000;

    nflow.v5Flows.forEach(function(raw) {
        byProto[raw.prot] = 1 + (byProto[raw.prot] || 0);

        var netflow = ip.parsePacket(raw, timestamp);
        if(netflow) {
//            console.log("GOT FLOW", netflow);

            var unordered = netflow.unordered();

            var k = unordered;

            rclient.get("last_"+k, function(err, value) {
                var key;
                key = netflow.ordered() + "_flags";
                var oldFlags = db.get(key);

                if(value && (netflow.first - value) > 60000) {
                    // REUSED EPHEMERAL PORT
                    oldFlags = 0;
                }

                db.set(key, (oldFlags || 0) | netflow.flags);

                key = unordered + "_flow" ;
                var flow;
                if(netflow.sport > netflow.dport)
                    flow = {src: netflow.srcEndpoint(), dst: netflow.dstEndpoint()};
                else
                    flow = {src: netflow.dstEndpoint(), dst: netflow.srcEndpoint()};

                db.set(key, flow);

                var sFlags = db.get(flow.src + "_" + flow.dst + "_flags") || 0;
                var dFlags = db.get(flow.dst + "_" + flow.src + "_flags") || 0;

                var tcpFlow = new ip.TcpFlow(flow, sFlags, dFlags);

                var state = tcpFlow.state();

//            console.log("got tcp netflow " + flow.src + " -> " + flow.dst + " (0x"+sFlags.toString(16)+" 0x"+dFlags.toString(16)+") state: " + state);

                var cmd = [];
                cmd.push("src_"+k);
                cmd.push(flow.src);
                cmd.push("dst_"+k);
                cmd.push(flow.dst);
                cmd.push("st_"+k);
                cmd.push(state);
                cmd.push("last_"+k);
                cmd.push(netflow.last);

                rclient.mset(cmd, function() {});

                rclient.expire("src_"+k, 60 * 10);
                rclient.expire("dst_"+k, 60 * 10);
                rclient.expire("st_"+k, 60 * 10);
                rclient.expire("last_"+k, 60 * 10);
            });
        } else {
//            console.log("unhandled ip packet", raw);
        }
    });

});

monitoring.app.get('/', function (req, res, next) {
    res.json({
        stats: {
            packetCount: packetCount,
            pdus: pdus,
            byProto: byProto,
            cacheLength: db.length
        }
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
