import * as u from '@virtuoso.dev/urx'
import { domIOSystem } from './domIOSystem'
export const windowScrollerSystem = u.system(([{ scrollTo, scrollContainerState }]) => {
  const windowScrollContainerState = u.stream()
  const windowViewportRect = u.stream()
  const windowScrollTo = u.stream()
  const useWindowScroll = u.statefulStream(false)
  const customScrollParent = u.statefulStream(undefined)
  u.connect(
    u.pipe(
      u.combineLatest(windowScrollContainerState, windowViewportRect),
      u.map(([{ viewportHeight, scrollTop: windowScrollTop, scrollHeight }, { offsetTop }]) => {
        return {
          scrollTop: Math.max(0, windowScrollTop - offsetTop),
          scrollHeight,
          viewportHeight,
        }
      })
    ),
    scrollContainerState
  )
  u.connect(
    u.pipe(
      scrollTo,
      u.withLatestFrom(windowViewportRect),
      u.map(([scrollTo, { offsetTop }]) => {
        return {
          ...scrollTo,
          top: scrollTo.top + offsetTop,
        }
      })
    ),
    windowScrollTo
  )
  return {
    // config
    useWindowScroll,
    customScrollParent,
    // input
    windowScrollContainerState,
    windowViewportRect,
    // signals
    windowScrollTo,
  }
}, u.tup(domIOSystem))
//# sourceMappingURL=windowScrollerSystem.js.map
