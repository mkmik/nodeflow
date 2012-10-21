'use strict';

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

var packetCount = 0;
var pdus = 0;

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

    var toUpdate = [];

    nflow.v5Flows.forEach(function(raw) {
        var netflow = ip.parsePacket(raw);
        if(netflow) {
            var unordered = netflow.unordered();

            var key;
            key = netflow.ordered() + "_flags";
            var oldFlags = db.get(key);
            db.set(key, (oldFlags || 0) | netflow.rawFlags);

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

            var k = unordered;
            toUpdate.push("src_"+k);
            toUpdate.push(flow.src);
            toUpdate.push("dst_"+k);
            toUpdate.push(flow.dst);
            toUpdate.push("st_"+k);
            toUpdate.push(state);
        } else {
//            console.log("unhandled ip packet", raw);
        }
    });

    rclient.mset(toUpdate, function() {});
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
