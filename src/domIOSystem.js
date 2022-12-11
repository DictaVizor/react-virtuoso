import * as u from '@virtuoso.dev/urx'
export const domIOSystem = u.system(
  () => {
    const scrollContainerState = u.stream()
    const scrollTop = u.stream()
    const deviation = u.statefulStream(0)
    const smoothScrollTargetReached = u.stream()
    const statefulScrollTop = u.statefulStream(0)
    const viewportHeight = u.stream()
    const scrollHeight = u.stream()
    const headerHeight = u.statefulStream(0)
    const footerHeight = u.statefulStream(0)
    const scrollTo = u.stream()
    const scrollBy = u.stream()
    const scrollingInProgress = u.statefulStream(false)
    // bogus, has no effect
    const react18ConcurrentRendering = u.statefulStream(false)
    u.connect(
      u.pipe(
        scrollContainerState,
        u.map(({ scrollTop }) => scrollTop)
      ),
      scrollTop
    )
    u.connect(
      u.pipe(
        scrollContainerState,
        u.map(({ scrollHeight }) => scrollHeight)
      ),
      scrollHeight
    )
    u.connect(scrollTop, statefulScrollTop)
    return {
      // input
      scrollContainerState,
      scrollTop,
      viewportHeight,
      headerHeight,
      footerHeight,
      scrollHeight,
      smoothScrollTargetReached,
      react18ConcurrentRendering,
      // signals
      scrollTo,
      scrollBy,
      // state
      statefulScrollTop,
      deviation,
      scrollingInProgress,
    }
  },
  [],
  { singleton: true }
)
//# sourceMappingURL=domIOSystem.js.map
