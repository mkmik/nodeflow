var Collector = require("Netflow");
var reloader = require('reloader');
var argv = require('optimist').argv;

var port = argv.p || 9996;


var tcp_flags = {};
tcp_flags["FIN"] = 0x1 << 0;
tcp_flags["SYN"] = 0x1 << 1;
tcp_flags["RST"] = 0x1 << 2;
tcp_flags["PSH"] = 0x1 << 3;
tcp_flags["ACK"] = 0x1 << 4;
tcp_flags["URG"] = 0x1 << 5;
tcp_flags["ECN"] = 0x1 << 6;
tcp_flags["CWN"] = 0x1 << 7;
tcp_flags["NNC"] = 0x1 << 8;

var app = new Collector(function (err) {
    if(err != null) {
        console.log("ERROR ERROR \n"+err);
    }
})
.on("listening",function() { console.log("listening", port); } )

.on("packet",function(packet) {
    function flags(f) {
        var res = {};
        for(var k in tcp_flags) {
            if((tcp_flags[k] & f) != 0)
                res[k] = true;
        }
        return res;
    }

    function renderFlags(f) {
        return Object.keys(f).join(',');
    }

    function renderIp(ips) {
        return ips.join('.');
    }

    packet.v5Flows.forEach(function(flow) {
        var ff = flow.tcp_flags;
        if(ff != 0) {
            var ffl = flags(ff);
            if(ffl.SYN && !ffl.ACK)
                console.log("New connection", flow.srcaddr, flow.srcport, flow.dstaddr, flow.dstport, "FLAAAGS", "0x" + ff.toString(16), renderFlags(ffl));

            if(renderIp(flow.srcaddr) == '146.48.87.66' || renderIp(flow.srcaddr) == '146.48.122.92')
                console.log("from me", renderIp(flow.srcaddr), flow.srcport, renderIp(flow.dstaddr), flow.dstport, "FLAAAGS", "0x" + ff.toString(16), renderFlags(ffl));

        }
//        else
//            console.log("boring Packet", flow.srcaddr, flow.srcport, flow.dstaddr, flow.dstport, "FLAAAGS", "0x" + flow.tcp_flags.toString(16), flags(flow.tcp_flags));

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

