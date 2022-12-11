const NIL_NODE = { lvl: 0 };
function newAANode(k, v, lvl, l = NIL_NODE, r = NIL_NODE) {
    return { k, v, lvl, l, r };
}
export function empty(node) {
    return node === NIL_NODE;
}
export function newTree() {
    return NIL_NODE;
}
export function remove(node, key) {
    if (empty(node))
        return NIL_NODE;
    const { k, l, r } = node;
    if (key === k) {
        if (empty(l)) {
            return r;
        }
        else if (empty(r)) {
            return l;
        }
        else {
            const [lastKey, lastValue] = last(l);
            return adjust(clone(node, { k: lastKey, v: lastValue, l: deleteLast(l) }));
        }
    }
    else if (key < k) {
        return adjust(clone(node, { l: remove(l, key) }));
    }
    else {
        return adjust(clone(node, { r: remove(r, key) }));
    }
}
export function find(node, key) {
    if (empty(node)) {
        return;
    }
    if (key === node.k) {
        return node.v;
    }
    else if (key < node.k) {
        return find(node.l, key);
    }
    else {
        return find(node.r, key);
    }
}
export function findMaxKeyValue(node, value, field = 'k') {
    if (empty(node)) {
        return [-Infinity, undefined];
    }
    if (node[field] === value) {
        return [node.k, node.v];
    }
    if (node[field] < value) {
        const r = findMaxKeyValue(node.r, value, field);
        if (r[0] === -Infinity) {
            return [node.k, node.v];
        }
        else {
            return r;
        }
    }
    return findMaxKeyValue(node.l, value, field);
}
export function insert(node, k, v) {
    if (empty(node)) {
        return newAANode(k, v, 1);
    }
    if (k === node.k) {
        return clone(node, { k, v });
    }
    else if (k < node.k) {
        return rebalance(clone(node, { l: insert(node.l, k, v) }));
    }
    else {
        return rebalance(clone(node, { r: insert(node.r, k, v) }));
    }
}
export function walkWithin(node, start, end) {
    if (empty(node)) {
        return [];
    }
    const { k, v, l, r } = node;
    let result = [];
    if (k > start) {
        result = result.concat(walkWithin(l, start, end));
    }
    if (k >= start && k <= end) {
        result.push({ k, v });
    }
    if (k <= end) {
        result = result.concat(walkWithin(r, start, end));
    }
    return result;
}
export function walk(node) {
    if (empty(node)) {
        return [];
    }
    return [...walk(node.l), { k: node.k, v: node.v }, ...walk(node.r)];
}
function last(node) {
    return empty(node.r) ? [node.k, node.v] : last(node.r);
}
function deleteLast(node) {
    return empty(node.r) ? node.l : adjust(clone(node, { r: deleteLast(node.r) }));
}
function clone(node, args) {
    return newAANode(args.k !== undefined ? args.k : node.k, args.v !== undefined ? args.v : node.v, args.lvl !== undefined ? args.lvl : node.lvl, args.l !== undefined ? args.l : node.l, args.r !== undefined ? args.r : node.r);
}
function isSingle(node) {
    return empty(node) || node.lvl > node.r.lvl;
}
function rebalance(node) {
    return split(skew(node));
}
function adjust(node) {
    const { l, r, lvl } = node;
    if (r.lvl >= lvl - 1 && l.lvl >= lvl - 1) {
        return node;
    }
    else if (lvl > r.lvl + 1) {
        if (isSingle(l)) {
            return skew(clone(node, { lvl: lvl - 1 }));
        }
        else {
            if (!empty(l) && !empty(l.r)) {
                return clone(l.r, {
                    l: clone(l, { r: l.r.l }),
                    r: clone(node, {
                        l: l.r.r,
                        lvl: lvl - 1,
                    }),
                    lvl: lvl,
                });
            }
            else {
                throw new Error('Unexpected empty nodes');
            }
        }
    }
    else {
        if (isSingle(node)) {
            return split(clone(node, { lvl: lvl - 1 }));
        }
        else {
            if (!empty(r) && !empty(r.l)) {
                const rl = r.l;
                const rlvl = isSingle(rl) ? r.lvl - 1 : r.lvl;
                return clone(rl, {
                    l: clone(node, {
                        r: rl.l,
                        lvl: lvl - 1,
                    }),
                    r: split(clone(r, { l: rl.r, lvl: rlvl })),
                    lvl: rl.lvl + 1,
                });
            }
            else {
                throw new Error('Unexpected empty nodes');
            }
        }
    }
}
export function keys(node) {
    if (empty(node)) {
        return [];
    }
    return [...keys(node.l), node.k, ...keys(node.r)];
}
export function ranges(node) {
    return toRanges(walk(node));
}
export function rangesWithin(node, startIndex, endIndex) {
    if (empty(node)) {
        return [];
    }
    const adjustedStart = findMaxKeyValue(node, startIndex)[0];
    return toRanges(walkWithin(node, adjustedStart, endIndex));
}
export function arrayToRanges(items, parser) {
    const length = items.length;
    if (length === 0) {
        return [];
    }
    let { index: start, value } = parser(items[0]);
    const result = [];
    for (let i = 1; i < length; i++) {
        const { index: nextIndex, value: nextValue } = parser(items[i]);
        result.push({ start, end: nextIndex - 1, value });
        start = nextIndex;
        value = nextValue;
    }
    result.push({ start, end: Infinity, value });
    return result;
}
function toRanges(nodes) {
    return arrayToRanges(nodes, ({ k: index, v: value }) => ({ index, value }));
}
function split(node) {
    const { r, lvl } = node;
    return !empty(r) && !empty(r.r) && r.lvl === lvl && r.r.lvl === lvl ? clone(r, { l: clone(node, { r: r.l }), lvl: lvl + 1 }) : node;
}
function skew(node) {
    const { l } = node;
    return !empty(l) && l.lvl === node.lvl ? clone(l, { r: clone(node, { l: l.r }) }) : node;
}
//# sourceMappingURL=AATree.js.map