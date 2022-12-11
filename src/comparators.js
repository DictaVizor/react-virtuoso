export function tupleComparator(prev, current) {
    return !!(prev && prev[0] === current[0] && prev[1] === current[1]);
}
export function rangeComparator(prev, next) {
    return !!(prev && prev.startIndex === next.startIndex && prev.endIndex === next.endIndex);
}
//# sourceMappingURL=comparators.js.map