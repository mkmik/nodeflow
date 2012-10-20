#!/bin/sh

iptables -t filter -N LOG_N_RETURN;
iptables -A LOG_N_RETURN -p UDP --dport 9996 -j RETURN;
iptables -A LOG_N_RETURN -j ULOG -p tcp -d 127.0.0.1 --dport 80 --ulog-nlgroup 1 --ulog-cprange 48 --ulog-qthreshold 50;
iptables -A LOG_N_RETURN -j ULOG -p tcp -d 127.0.0.1 --sport 80 --ulog-nlgroup 1 --ulog-cprange 48 --ulog-qthreshold 50;
iptables -A LOG_N_RETURN -j RETURN;

#iptables -t filter -I INPUT 1 -j LOG_N_RETURN;
#iptables -t filter -I OUTPUT 1 -j LOG_N_RETURN;
#iptables -t filter -I FORWARD 1 -j LOG_N_RETURN;
