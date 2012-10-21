#!/usr/bin/python

import argparse
import redis
import socket

from collections import defaultdict

parser = argparse.ArgumentParser()
parser.add_argument('-s', help="show only connections in a given state", required=False)
parser.add_argument('--dport', help="only this destination port", required=False)
parser.add_argument('--sport', help="only this source port", required=False)
parser.add_argument('--port', help="only this port (src or dest)", required=False)
parser.add_argument('-r', action="store_false", help="don't parse src/dest", required=False)
parser.add_argument('-n', action="store_true", help="resolve names", required=False)
args = parser.parse_args()


c = redis.Redis()

states = defaultdict(lambda: 0)


VALID_DOMAINS = ['research-infrastructures.eu', 'cern.ch', 'isti.cnr.it', 'ifh.de']

KNOWN_NETWORKS = ['127.0.0', '146.48', '137.13', '194.171', '141.34', '192.108', '128.142.164']
if hasattr(socket, 'setdefaulttimeout'):
    # Set the default timeout on sockets to 5 seconds
    socket.setdefaulttimeout(2)

def controlled_domains(name):
    for d in VALID_DOMAINS:
        if name.endswith(d):
            return True
    return False

def known_networks(name):
    for d in KNOWN_NETWORKS:
        if name.startswith(d):
            return True
    return False

cache = {}
def get_hostname(addr):
    # quick filter to speedup reverse
    if not known_networks(addr):
        return addr

    if addr in cache:
        return cache[addr]

    try:
        name = socket.gethostbyaddr(addr)[0]
        if controlled_domains(name) or addr.startswith('127.0.0.'):
            cache[addr] = name
            return name
        return addr
    except:
        return addr


def show(s, k):
    prefilter = args.port or args.dport or args.sport
    if prefilter and (':'+prefilter) not in k:
        return

    if args.r:
        key = k[3:]
        src, dst = c.mget('src_'+key, 'dst_'+key)

        def render():
            if args.n:
                srcip, sport = src.split(':')
                dstip, dport = dst.split(':')
                print s, get_hostname(srcip)+':' + sport, '->', get_hostname(dstip) +':' + dport
            else:
                print s, src, '->', dst

        if args.port:
            if (src.endswith(':'+args.port) or dst.endswith(':'+args.port)):
                render()
        elif args.dport:
            if dst.endswith(':'+args.dport):
                render()
        elif args.sport:
            if src.endswith(':'+args.sport):
                render()
        else:
            render()
    else:
        print s, k

keys = c.keys('st_*')
if keys:
    for k, s in zip(keys, c.mget(keys)):
        if args.s:
            if s == args.s:
                show(s, k)
        else:
            show(s, k)
