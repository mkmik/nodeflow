var TCP = 6;
var UDP = 7;

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

function parseFlags(f) {
    var res = {};
    for(var k in tcp_flags) {
        if((tcp_flags[k] & f) != 0)
            res[k] = true;
    }
    return res;
}


function parseIp(ips) {
    return ips.join('.');
}

function TcpPacket(src, sport, dst, dport, flags) {
    this.src = parseIp(src);
    this.sport = sport;
    this.dst = parseIp(dst);
    this.dport = dport;
    this.flags = parseFlags(flags);
    this.rawFlags = flags;

    this.isStartOfConnection = this.flags.SYN && !this.flags.ACK;
    this.isAckOfConnection = this.flags.SYN && this.flags.ACK;
    this.isFinOfConnection = this.flags.FIN;
}

TcpPacket.prototype.srcEndpoint = function() {
    return this.src+":"+this.sport;
}

TcpPacket.prototype.dstEndpoint = function() {
    return this.src+":"+this.sport;
}

function parsePacket(pckt) {
    if(pckt.prot == TCP) {
        return new TcpPacket(pckt.srcaddr, pckt.srcport, pckt.dstaddr, pckt.dstport, pckt.tcp_flags);
    }
}

exports.TcpPacket = TcpPacket;

exports.parsePacket = parsePacket;

exports.TCP = TCP;
exports.UDP = UDP;
