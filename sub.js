'use strict';

var ip = require('./lib/ip');
var redis = require('redis');
var LRU = require("lru-cache");
var zmq = require('zmq')
  , sock = zmq.socket('pull');

sock.connect('tcp://127.0.0.1:3412');

var rclient = redis.createClient();

var ttl = 60 * 60;

sock.on("message", function(data) {
    data = JSON.parse(data);
    var timestamp = data.timestamp;

    data.flows.forEach(function(raw) {
        var netflow = ip.parsePacket(raw, timestamp);
        if(netflow) {
            if(netflow.dport > netflow.sport) {
                // reply
                return;
            } else {
                var connectionKey = netflow.directed();
                if(netflow.parsedFlags.SYN)
                    rclient.incr('conns_' + connectionKey);
                rclient.incrby('packets_' + connectionKey, raw.dPkts);
                rclient.incrby('octets_' + connectionKey, raw.dOctets);

                rclient.expire('conns_' + connectionKey, ttl);
                rclient.expire('packets_' + connectionKey, ttl);
                rclient.expire('octets_' + connectionKey, ttl);
            }
        }
    });
});
