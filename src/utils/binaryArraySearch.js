export function findIndexOfClosestSmallerOrEqual(items, value, comparator, start = 0) {
    let end = items.length - 1;
    while (start <= end) {
        const index = Math.floor((start + end) / 2);
        const item = items[index];
        const match = comparator(item, value);
        if (match === 0) {
            return index;
        }
        if (match === -1) {
            if (end - start < 2) {
                return index - 1;
            }
            end = index - 1;
        }
        else {
            if (end === start) {
                return index;
            }
            start = index + 1;
        }
    }
    throw new Error(`Failed binary finding record in array - ${items.join(',')}, searched for ${value}`);
}
export function findClosestSmallerOrEqual(items, value, comparator) {
    return items[findIndexOfClosestSmallerOrEqual(items, value, comparator)];
}
export function findRange(items, startValue, endValue, comparator) {
    const startIndex = findIndexOfClosestSmallerOrEqual(items, startValue, comparator);
    const endIndex = findIndexOfClosestSmallerOrEqual(items, endValue, comparator, startIndex);
    return items.slice(startIndex, endIndex + 1);
}
//# sourceMappingURL=binaryArraySearch.js.map