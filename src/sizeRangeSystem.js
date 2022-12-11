import * as u from '@virtuoso.dev/urx'
import { domIOSystem } from './domIOSystem'
import { UP, DOWN } from './stateFlagsSystem'
import { tupleComparator } from './comparators'
export const TOP = 'top'
export const BOTTOM = 'bottom'
export const NONE = 'none'
export function getOverscan(overscan, end, direction) {
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
function getViewportIncrease(value, end) {
  return typeof value === 'number' ? value : value[end] || 0
}
export const sizeRangeSystem = u.system(
  ([{ scrollTop, viewportHeight, deviation, headerHeight }]) => {
    const listBoundary = u.stream()
    const topListHeight = u.statefulStream(0)
    const fixedHeaderHeight = u.statefulStream(0)
    const increaseViewportBy = u.statefulStream(0)
    const overscan = u.statefulStream(0)
    const customStartIndex = u.statefulStream(undefined)
    const keepIndexRendered = u.statefulStream(undefined)
    const extraSize = u.stream()
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
            let direction = NONE
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
              ]
            }
            return null
          }
        ),
        u.filter((value) => value != null),
        u.distinctUntilChanged(tupleComparator)
      ),
      [0, 0]
    )
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
//# sourceMappingURL=sizeRangeSystem.js.map
