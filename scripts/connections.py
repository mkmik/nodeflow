#!/usr/bin/python

import argparse
import redis

from collections import defaultdict

parser = argparse.ArgumentParser()
parser.add_argument('-s', help="show only connections in a given state", required=False)
parser.add_argument('--dport', help="only this destination port", required=False)
parser.add_argument('--sport', help="only this source port", required=False)
parser.add_argument('--port', help="only this port (src or dest)", required=False)
parser.add_argument('-r', action="store_false", help="don't parse src/dest", required=False)
args = parser.parse_args()


c = redis.Redis()

states = defaultdict(lambda: 0)

def show(s, k):
    prefilter = args.port or args.dport or args.sport
    if prefilter and (':'+prefilter) not in k:
        return

    if args.r:
        key = k[3:]
        src, dst = c.mget('src_'+key, 'dst_'+key)

        if args.port:
            if (src.endswith(':'+args.port) or dst.endswith(':'+args.port)):
                print s, src,'->', dst
        elif args.dport:
            if dst.endswith(':'+args.dport):
                print s, src,'->', dst
        elif args.sport:
            if src.endswith(':'+args.sport):
                print s, src,'->', dst
        else:
            print s, src,'->', dst
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
