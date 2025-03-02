import * as u from '@virtuoso.dev/urx'
import { empty, findMaxKeyValue, Range, rangesWithin } from './AATree'
import { groupedListSystem } from './groupedListSystem'
import { getInitialTopMostItemIndexNumber, initialTopMostItemIndexSystem } from './initialTopMostItemIndexSystem'
import { Item, ListItem, ListRange } from './interfaces'
import { propsReadySystem } from './propsReadySystem'
import { scrollToIndexSystem } from './scrollToIndexSystem'
import { sizeRangeSystem } from './sizeRangeSystem'
import { Data, originalIndexFromItemIndex, SizeState, sizeSystem, hasGroups, rangesWithinOffsets } from './sizeSystem'
import { stateFlagsSystem } from './stateFlagsSystem'
import { rangeComparator, tupleComparator } from './comparators'
import { uniqBy } from 'lodash'

export type ListItems = ListItem<unknown>[]
export interface TopListState {
  items: ListItems
  listHeight: number
}

export interface ListState {
  items: ListItems
  topItems: ListItems
  topListHeight: number
  offsetTop: number
  offsetBottom: number
  top: number
  bottom: number
  totalCount: number
  extraSize: number
}

function probeItemSet(index: number, sizes: SizeState, data: Data) {
  if (hasGroups(sizes)) {
    const itemIndex = originalIndexFromItemIndex(index, sizes)
    const groupIndex = findMaxKeyValue(sizes.groupOffsetTree, itemIndex)[0]

    return [
      { index: groupIndex, size: 0, offset: 0 },
      { index: itemIndex, size: 0, offset: 0, data: data && data[0] },
    ]
  }
  return [{ index, size: 0, offset: 0, data: data && data[0] }]
}

const EMPTY_LIST_STATE: ListState = {
  items: [] as ListItems,
  topItems: [] as ListItems,
  offsetTop: 0,
  offsetBottom: 0,
  top: 0,
  bottom: 0,
  topListHeight: 0,
  totalCount: 0,
  extraSize: 0,
}

function transposeItems(items: Item<any>[], sizes: SizeState, firstItemIndex: number): ListItems {
  if (items.length === 0) {
    return []
  }

  if (!hasGroups(sizes)) {
    return items.map((item) => ({ ...item, index: item.index + firstItemIndex, originalIndex: item.index }))
  }

  const startIndex = items[0].index
  const endIndex = items[items.length - 1].index

  const transposedItems = [] as ListItems
  const groupRanges = rangesWithin(sizes.groupOffsetTree, startIndex, endIndex)
  let currentRange: Range<number> | undefined = undefined
  let currentGroupIndex = 0

  for (const item of items) {
    if (!currentRange || currentRange.end < item.index) {
      currentRange = groupRanges.shift()!
      currentGroupIndex = sizes.groupIndices.indexOf(currentRange.start)
    }

    let transposedItem: { type: 'group'; index: number } | { index: number; groupIndex: number }

    if (item.index === currentRange.start) {
      transposedItem = {
        type: 'group' as const,
        index: currentGroupIndex,
      }
    } else {
      transposedItem = {
        index: item.index - (currentGroupIndex + 1) + firstItemIndex,
        groupIndex: currentGroupIndex,
      }
    }

    transposedItems.push({
      ...transposedItem,
      size: item.size,
      offset: item.offset,
      originalIndex: item.index,
      data: item.data,
    })
  }

  return transposedItems
}

export function buildListState(
  items: Item<any>[],
  topItems: Item<any>[],
  totalCount: number,
  sizes: SizeState,
  firstItemIndex: number
): ListState {
  const { lastSize, lastOffset, lastIndex } = sizes
  let offsetTop = 0
  let bottom = 0

  const filteredItems = items.filter((item) => item.isCustom)
  const extraSize = filteredItems.reduce<number>((a, b) => a + b.size, 0)

  if (items.length > 0) {
    offsetTop = items[0].offset
    const lastItem = items[items.length - 1]
    bottom = lastItem.offset + lastItem.size
  }

  const total = lastOffset + (totalCount - lastIndex) * lastSize
  const top = offsetTop
  const offsetBottom = total - bottom

  return {
    items: transposeItems(items, sizes, firstItemIndex),
    topItems: transposeItems(topItems, sizes, firstItemIndex),
    topListHeight: topItems.reduce((height, item) => item.size + height, 0),
    offsetTop,
    offsetBottom,
    top: top,
    bottom: bottom,
    totalCount,
    extraSize,
  }
}

export const listStateSystem = u.system(
  ([
    { sizes, totalCount, data, firstItemIndex },
    groupedListSystem,
    { visibleRange, listBoundary, topListHeight: rangeTopListHeight, customStartIndex, extraSize, keepIndexRendered },
    { scrolledToInitialItem, initialTopMostItemIndex },
    { topListHeight },
    stateFlags,
    { didMount },
  ]) => {
    const topItemsIndexes = u.statefulStream<Array<number>>([])
    const itemsRendered = u.stream<ListItems>()
    const startIndex = u.statefulStream<number | undefined>(undefined)

    u.connect(groupedListSystem.topItemsIndexes, topItemsIndexes)
    u.connect(customStartIndex, startIndex)

    const listState = u.statefulStreamFromEmitter(
      u.pipe(
        u.combineLatest(
          didMount,
          u.duc(visibleRange),
          u.duc(totalCount),
          u.duc(sizes),
          u.duc(initialTopMostItemIndex),
          scrolledToInitialItem,
          u.duc(topItemsIndexes),
          u.duc(firstItemIndex),
          startIndex,
          keepIndexRendered,
          data
        ),
        u.filter(([mount]) => mount),
        u.map(
          ([
            ,
            [startOffset, endOffset],
            totalCount,
            sizes,
            initialTopMostItemIndex,
            scrolledToInitialItem,
            topItemsIndexes,
            firstItemIndex,
            customStartIndex,
            keepIndexRendered,
            data,
          ]) => {
            const sizesValue = sizes
            const { sizeTree, offsetTree } = sizesValue
            if (totalCount === 0 || (startOffset === 0 && endOffset === 0)) {
              return EMPTY_LIST_STATE
            }

            if (empty(sizeTree)) {
              return buildListState(
                probeItemSet(getInitialTopMostItemIndexNumber(initialTopMostItemIndex, totalCount), sizesValue, data),
                [],
                totalCount,
                sizesValue,
                firstItemIndex
              )
            }

            const topItems = [] as Item<any>[]

            if (topItemsIndexes.length > 0) {
              const startIndex = topItemsIndexes[0]
              const endIndex = topItemsIndexes[topItemsIndexes.length - 1]
              let offset = 0
              for (const range of rangesWithin(sizeTree, startIndex, endIndex)) {
                const size = range.value
                const rangeStartIndex = Math.max(range.start, startIndex)
                const rangeEndIndex = Math.min(range.end, endIndex)
                for (let i = rangeStartIndex; i <= rangeEndIndex; i++) {
                  topItems.push({ index: i, size, offset: offset, data: data && data[i] })
                  offset += size
                }
              }
            }

            // If the list hasn't scrolled to the initial item because the initial item was set,
            // render empty list.
            //
            // This is a condition to be evaluated past the probe check, do not merge
            // with the totalCount check above
            if (!scrolledToInitialItem) {
              return buildListState([], topItems, totalCount, sizesValue, firstItemIndex)
            }

            const minStartIndex = topItemsIndexes.length > 0 ? topItemsIndexes[topItemsIndexes.length - 1] + 1 : 0

            let offsetPointRanges = rangesWithinOffsets(offsetTree, startOffset, endOffset, minStartIndex)
            if (offsetPointRanges.length === 0) {
              return null
            }

            const firstIndex = offsetPointRanges[0].start
            const lastIndex = offsetPointRanges[offsetPointRanges.length - 1].start
            if (customStartIndex !== undefined) {
              if (customStartIndex < firstIndex) {
                const customOffsetPointRanges = rangesWithinOffsets(offsetTree, 0, startOffset, minStartIndex).filter(
                  ({ start }) => start >= customStartIndex && start < firstIndex
                )

                offsetPointRanges = uniqBy(
                  [
                    ...customOffsetPointRanges.map((range) => {
                      return { ...range, isCustom: true }
                    }),
                    ...offsetPointRanges,
                  ],
                  'start'
                )
              } else {
                const customOffsetPointRanges = rangesWithinOffsets(offsetTree, startOffset, Infinity, minStartIndex).filter(
                  ({ start }) => start <= customStartIndex && lastIndex <= start
                )

                offsetPointRanges = uniqBy(
                  [
                    ...customOffsetPointRanges.map((range) => {
                      return { ...range, isCustom: true }
                    }),
                    ...offsetPointRanges,
                  ],
                  'start'
                )
              }
              offsetPointRanges.sort((a, b) => a.start - b.start)
            }

            const maxIndex = totalCount - 1
            const extraSize = offsetPointRanges.filter((range) => range.isCustom).reduce<number>((a, b) => a + b.value.size, 0)

            const items = u.tap([] as Item<any>[], (result) => {
              for (const range of offsetPointRanges) {
                const point = range.value
                let offset = point.offset
                let rangeStartIndex = range.start
                const size = point.size

                const endIndex = Math.min(range.end, maxIndex)

                if (point.offset < startOffset - extraSize && !range.isCustom) {
                  rangeStartIndex += Math.floor((startOffset - point.offset - extraSize) / size)
                  offset += (rangeStartIndex - range.start) * size
                }

                if (rangeStartIndex < minStartIndex) {
                  offset += (minStartIndex - rangeStartIndex) * size
                  rangeStartIndex = minStartIndex
                }

                for (let i = rangeStartIndex; i <= endIndex; i++) {
                  if (offset >= endOffset && !range.isCustom) {
                    break
                  }

                  result.push({ index: i, size, offset: offset, data: data && data[i], isCustom: range.isCustom })
                  offset += size
                }
              }

              if (keepIndexRendered !== undefined) {
                const _keepIndexRendered = Array.isArray(keepIndexRendered) ? keepIndexRendered : [keepIndexRendered]

                const insertedIndexes: Array<number> = []

                _keepIndexRendered.sort().forEach((keepIndexRendered) => {
                  const isNumber = typeof keepIndexRendered === 'number'
                  const index = isNumber ? keepIndexRendered : keepIndexRendered.index
                  if (result.find((item) => item.index === index)) return


                  const useFullHeight = isNumber ? false : keepIndexRendered.fullHeight

                  insertedIndexes.push(index)

                  result.push({
                    index,
                    size: 0,
                    offset: 0,
                    data: data && data[index],
                    renderOutside: true,
                    isCustom: true,
                    useFullHeight,
                  })
                })

                result.sort((a, b) => a.index - b.index)
                insertedIndexes
                  .sort((a, b) => a - b)
                  .reverse()
                  .forEach((keepIndexRendered) => {
                    const targetIndex = result.findIndex(({ index }) => index === keepIndexRendered)
                    result[targetIndex].offset = result?.[targetIndex - 1]?.offset || result?.[targetIndex + 1]?.offset || 0
                  })
              }
            })

            return buildListState(items, topItems, totalCount, sizesValue, firstItemIndex)
          }
        ),
        //@ts-expect-error filter needs to be fixed
        u.filter((value) => value !== null),
        u.distinctUntilChanged()
      ),
      EMPTY_LIST_STATE
    )

    u.connect(
      u.pipe(
        data,
        u.filter((data) => data !== undefined),
        u.map((data) => data!.length)
      ),
      totalCount
    )

    u.connect(u.pipe(listState, u.map(u.prop('topListHeight'))), topListHeight)
    u.connect(topListHeight, rangeTopListHeight)

    u.connect(
      u.pipe(
        listState,
        u.map((state) => [state.top, state.bottom])
      ),
      listBoundary
    )

    u.connect(
      u.pipe(
        listState,
        u.map((state) => state.extraSize)
      ),
      extraSize
    )

    u.connect(
      u.pipe(
        listState,
        u.map((state) => state.items)
      ),
      itemsRendered
    )

    const endReached = u.streamFromEmitter(
      u.pipe(
        listState,
        u.filter(({ items }) => items.length > 0),
        u.withLatestFrom(totalCount, data),
        u.filter(([{ items }, totalCount]) => items[items.length - 1].originalIndex === totalCount - 1),
        u.map(([, totalCount, data]) => [totalCount - 1, data] as [number, unknown[]]),
        u.distinctUntilChanged(tupleComparator),
        u.map(([count]) => count as number)
      )
    )

    const startReached = u.streamFromEmitter(
      u.pipe(
        listState,
        u.throttleTime(200),
        u.filter(({ items, topItems }) => {
          return items.length > 0 && items[0].originalIndex === topItems.length
        }),
        u.map(({ items }) => items[0].index),
        u.distinctUntilChanged()
      )
    )

    const rangeChanged = u.streamFromEmitter(
      u.pipe(
        listState,
        u.filter(({ items }) => items.length > 0),
        u.map(({ items }) => {
          return {
            startIndex: items[0].index,
            endIndex: items[items.length - 1].index,
          } as ListRange
        }),
        u.distinctUntilChanged(rangeComparator)
      )
    )

    return { listState, topItemsIndexes, endReached, startReached, rangeChanged, itemsRendered, ...stateFlags }
  },
  u.tup(
    sizeSystem,
    groupedListSystem,
    sizeRangeSystem,
    initialTopMostItemIndexSystem,
    scrollToIndexSystem,
    stateFlagsSystem,
    propsReadySystem
  ),
  { singleton: true }
)
