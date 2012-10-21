#!/usr/bin/python

import redis

from collections import defaultdict

c = redis.Redis()

states = defaultdict(lambda: 0)

keys = c.keys('st_*')
if keys:
    for s in c.mget(keys):
        states[s] += 1

    for s, n in states.items():
        print s, n
