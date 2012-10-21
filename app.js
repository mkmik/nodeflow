'use strict';

var Collector = require("Netflow");
var reloader = require('reloader');
var ip = require('./lib/ip');
var argv = require('optimist').argv;
var LRU = require("lru-cache");
var mongoose = require('mongoose');

var mdb = mongoose.createConnection('localhost', 'nodeflow');
var flowSchema = mongoose.Schema({
    id: 'string',
    src: 'string',
    dst: 'string',
    state: 'string'
}, { strict: false });

var Flow = mdb.model('Flow', flowSchema);

var db = LRU({
    max: 500000,
    maxAge: 1000 * 600
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

    if(packetCount % 100 == 0)
        console.log("GOT PACKET:", packetCount, "PDU: ", pdus);

    var toUpdate = {};

    nflow.v5Flows.forEach(function(raw) {
        var netflow = ip.parsePacket(raw);
        if(netflow) {
            var key;

            key = netflow.ordered() + "_flags";
            var oldFlags = db.get(key);
            db.set(key, (oldFlags || 0) | netflow.rawFlags);

            key = netflow.unordered() + "_flow" ;
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

            var mFlowAttrs = {
                id: netflow.unordered(),
                src: flow.src,
                dst: flow.dst,
                state: state,
                sFlags: tcpFlow.sFlags,
                dFlags: tcpFlow.dFlags
            };

            toUpdate[mFlowAttrs.id] = mFlowAttrs;
        } else {
//            console.log("unhandled ip packet", raw);
        }
    });


    function store(attrs) {
        var flow = new Flow(attrs);
        flow.save(function(err) {
            if(err)
                console.log("CANNOT SAVE", flow);
        });
    }

    for(var k in toUpdate) {
        var attrs = toUpdate[k];

        Flow.findOne({id:attrs.id}, function(err, obj) {
            var boundAttrs = attrs;
            if(obj) {
                obj.remove(function(err) {
                    if(err)
                        console.log("CANNOT REMOVE", obj);
                    else
                        store(boundAttrs);
                });
            } else {
                store(boundAttrs);
            }
        });
    }
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
