var TCP = 6;
var UDP = 7;

var flow_inact_tout = 1000*60*10;
var flow_inact_tout_f = 1000*60;

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

function TcpFlow(netflow, sFlags, dFlags) {
    this.src = netflow.src;
    this.dst = netflow.dst;

    this.sFlags = parseFlags(sFlags);
    this.dFlags = parseFlags(dFlags);
    this.rawSFlags = dFlags;
    this.rawDFlags = dFlags;
}

TcpFlow.prototype.state = function() {
    var sFlags = this.sFlags;
    var dFlags = this.dFlags;

    if( sFlags.SYN && !dFlags.SYN && dFlags.RST)
        return "REJ";
    if(!sFlags.SYN && dFlags.RST)
        return "RSTRH";
    if(               dFlags.RST)
        return "RSTR";
    if( sFlags.SYN &&  sFlags.RST && !dFlags.SYN)
        return "RSTOS0";
    if( sFlags.SYN &&  sFlags.RST && !dFlags.SYN)
        return "RSTOS0";
    if(                sFlags.RST)
        return "RSTO";
    if( sFlags.SYN &&  sFlags.FIN && !sFlags.RST  &&  dFlags.SYN &&  dFlags.FIN && !dFlags.RST)
        return "SF";
    if( sFlags.SYN &&  sFlags.FIN && !sFlags.RST  &&  dFlags.SYN && !dFlags.FIN && !dFlags.RST)
        return "S2";
    if( sFlags.SYN &&  sFlags.FIN && !sFlags.RST  &&  dFlags.SYN                && !dFlags.RST)
        return "SH";
    if( sFlags.SYN && !sFlags.FIN && !sFlags.RST  &&  dFlags.SYN &&  dFlags.FIN && !dFlags.RST)
        return "S3";
    if(!sFlags.SYN &&                !sFlags.RST  &&  dFlags.SYN &&  dFlags.FIN && !dFlags.RST)
        return "SHR";

    if( sFlags.SYN &&                !sFlags.RST  && !dFlags.SYN                && !dFlags.RST)
        return "S0";
    if( sFlags.SYN && !sFlags.FIN && !sFlags.RST  &&  dFlags.SYN && !dFlags.FIN && !dFlags.RST)
        return "S1";

    return "OTH";
}

function TcpNetFlow(src, sport, dst, dport, flags, first, last) {
    this.src = parseIp(src);
    this.sport = sport;
    this.dst = parseIp(dst);
    this.dport = dport;
    this.flags = flags;
    this.first = first;
    this.last = last;
}

TcpNetFlow.prototype.unordered = function() {
    var src = this.srcEndpoint();
    var dst = this.dstEndpoint();
    if(src < dst)
        return src+"_"+dst;
    else
        return dst+"_"+src;
}

TcpNetFlow.prototype.ordered = function() {
    var src = this.srcEndpoint();
    var dst = this.dstEndpoint();
    return src+"_"+dst;
}

TcpNetFlow.prototype.srcEndpoint = function() {
    return this.src+":"+this.sport;
}

TcpNetFlow.prototype.dstEndpoint = function() {
    return this.dst+":"+this.dport;
}

function parsePacket(pckt, basetime) {
    if(pckt.prot == TCP) {
        return new TcpNetFlow(pckt.srcaddr, pckt.srcport, pckt.dstaddr, pckt.dstport, pckt.tcp_flags, basetime + pckt.first, basetime + pckt.last);
    }
}

exports.TcpNetFlow = TcpNetFlow;
exports.TcpFlow = TcpFlow;

exports.parsePacket = parsePacket;

exports.TCP = TCP;
exports.UDP = UDP;
