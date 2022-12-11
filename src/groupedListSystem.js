import { combineLatest, connect, distinctUntilChanged, system, filter, map, pipe, prop, stream, streamFromEmitter, tup, } from '@virtuoso.dev/urx';
import { findMaxKeyValue } from './AATree';
import { domIOSystem } from './domIOSystem';
import { sizeSystem, hasGroups } from './sizeSystem';
export function groupCountsToIndicesAndCount(counts) {
    return counts.reduce((acc, groupCount) => {
        acc.groupIndices.push(acc.totalCount);
        acc.totalCount += groupCount + 1;
        return acc;
    }, {
        totalCount: 0,
        groupIndices: [],
    });
}
export const groupedListSystem = system(([{ totalCount, groupIndices, sizes }, { scrollTop, headerHeight }]) => {
    const groupCounts = stream();
    const topItemsIndexes = stream();
    const groupIndicesAndCount = streamFromEmitter(pipe(groupCounts, map(groupCountsToIndicesAndCount)));
    connect(pipe(groupIndicesAndCount, map(prop('totalCount'))), totalCount);
    connect(pipe(groupIndicesAndCount, map(prop('groupIndices'))), groupIndices);
    connect(pipe(combineLatest(scrollTop, sizes, headerHeight), filter(([_, sizes]) => hasGroups(sizes)), map(([scrollTop, state, headerHeight]) => findMaxKeyValue(state.groupOffsetTree, Math.max(scrollTop - headerHeight, 0), 'v')[0]), distinctUntilChanged(), map((index) => [index])), topItemsIndexes);
    return { groupCounts, topItemsIndexes };
}, tup(sizeSystem, domIOSystem));
//# sourceMappingURL=groupedListSystem.js.map