"""Difficulty curriculum for cognitive training data."""
from __future__ import annotations
from collections import Counter

def curriculum(probes):
    grouped={1:[],2:[],3:[]}
    for p in probes: grouped.setdefault(p.difficulty,[]).append(p)
    return grouped

def coverage(probes):
    return dict(Counter(p.category for p in probes))
