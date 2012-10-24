'use strict';

var ip = require('./lib/ip');
var redis = require('redis');
var LRU = require("lru-cache");
var zmq = require('zmq')
  , sock = zmq.socket('pull');

sock.connect('tcp://127.0.0.1:3412');

var db = LRU({
    max: 200000,
    maxAge: 1000 * 600
});


var rclient = redis.createClient();

sock.on("message", function(data) {
    data = JSON.parse(data);
    var raw = data.raw;
    var timestamp = data.timestamp;

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


            var flow;
            if(netflow.sport > netflow.dport)
                flow = {src: netflow.srcEndpoint(), dst: netflow.dstEndpoint()};
            else
                flow = {src: netflow.dstEndpoint(), dst: netflow.srcEndpoint()};

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
