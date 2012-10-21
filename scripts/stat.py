#!/usr/bin/python

import redis

from collections import defaultdict

c = redis.Redis()

states = defaultdict(lambda: 0)

for s in c.mget(c.keys('st_*')):
    states[s] += 1

for s, n in states.items():
    print s, n
