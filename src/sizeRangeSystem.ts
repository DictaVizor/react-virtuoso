import * as u from '@virtuoso.dev/urx'
import { domIOSystem } from './domIOSystem'
import { UP, DOWN, ScrollDirection } from './stateFlagsSystem'
import { tupleComparator } from './comparators'
import { KeepIndexRendered } from './components'

export type NumberTuple = [number, number]
export type Overscan = number | { main: number; reverse: number }
export const TOP = 'top' as const
export const BOTTOM = 'bottom' as const
export const NONE = 'none' as const
export type ListEnd = typeof TOP | typeof BOTTOM
export type ViewportIncrease = number | { [k in ListEnd]?: number }
export type ChangeDirection = typeof UP | typeof DOWN | typeof NONE

export function getOverscan(overscan: Overscan, end: ListEnd, direction: ScrollDirection) {
  if (typeof overscan === 'number') {
    return (direction === UP && end === TOP) || (direction === DOWN && end === BOTTOM) ? overscan : 0
  } else {
    if (direction === UP) {
      return end === TOP ? overscan.main : overscan.reverse
    } else {
      return end === BOTTOM ? overscan.main : overscan.reverse
    }
  }
}

function getViewportIncrease(value: ViewportIncrease, end: ListEnd) {
  return typeof value === 'number' ? value : value[end] || 0
}

export const sizeRangeSystem = u.system(
  ([{ scrollTop, viewportHeight, deviation, headerHeight }]) => {
    const listBoundary = u.stream<NumberTuple>()
    const topListHeight = u.statefulStream(0)
    const fixedHeaderHeight = u.statefulStream(0)
    const increaseViewportBy = u.statefulStream<ViewportIncrease>(0)
    const overscan = u.statefulStream<Overscan>(0)
    const customStartIndex = u.statefulStream<number | undefined>(undefined)
    const keepIndexRendered = u.statefulStream<KeepIndexRendered | Array<KeepIndexRendered> | undefined>(undefined)
    const extraSize = u.stream<number>()

    const visibleRange = u.statefulStreamFromEmitter(
      u.pipe(
        u.combineLatest(
          u.duc(scrollTop),
          u.duc(viewportHeight),
          u.duc(headerHeight),
          u.duc(listBoundary, tupleComparator),
          u.duc(overscan),
          u.duc(topListHeight),
          u.duc(fixedHeaderHeight),
          u.duc(deviation),
          u.duc(increaseViewportBy),
          u.duc(extraSize)
        ),
        u.map(
          ([
            scrollTop,
            viewportHeight,
            headerHeight,
            [listTop, listBottom],
            overscan,
            topListHeight,
            fixedHeaderHeight,
            deviation,
            increaseViewportBy,
            extraSize,
          ]) => {
            const top = scrollTop - deviation
            const stickyHeaderHeight = topListHeight + fixedHeaderHeight
            const headerVisible = Math.max(headerHeight - top, 0)
            let direction: ChangeDirection = NONE
            const topViewportAddition = getViewportIncrease(increaseViewportBy, TOP)
            const bottomViewportAddition = getViewportIncrease(increaseViewportBy, BOTTOM)

            listTop -= deviation
            listTop += headerHeight + fixedHeaderHeight
            listBottom += headerHeight + fixedHeaderHeight
            listBottom -= deviation

            if (listTop > scrollTop + stickyHeaderHeight - topViewportAddition - extraSize) {
              direction = UP
            }

            if (listBottom < scrollTop - headerVisible + viewportHeight + bottomViewportAddition + extraSize) {
              direction = DOWN
            }

            if (direction !== NONE) {
              return [
                Math.max(top - headerHeight - getOverscan(overscan, TOP, direction) - topViewportAddition, 0),
                top -
                  headerVisible -
                  fixedHeaderHeight +
                  viewportHeight +
                  getOverscan(overscan, BOTTOM, direction) +
                  bottomViewportAddition,
              ] as NumberTuple
            }

            return null
          }
        ),
        u.filter((value) => value != null),
        u.distinctUntilChanged(tupleComparator as any)
      ),
      [0, 0]
    ) as unknown as u.StatefulStream<NumberTuple>

    return {
      // input
      listBoundary,
      overscan,
      topListHeight,
      fixedHeaderHeight,
      increaseViewportBy,
      customStartIndex,
      keepIndexRendered,
      extraSize,

      // output
      visibleRange,
    }
  },
  u.tup(domIOSystem),
  { singleton: true }
)
