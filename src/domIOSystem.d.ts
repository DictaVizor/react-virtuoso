import * as u from '@virtuoso.dev/urx'
import { ScrollContainerState } from './interfaces'
export declare const domIOSystem: u.SystemSpec<
  never[],
  () => {
    scrollContainerState: u.Stream<ScrollContainerState>
    scrollTop: u.Stream<number>
    viewportHeight: u.Stream<number>
    headerHeight: u.StatefulStream<number>
    footerHeight: u.StatefulStream<number>
    scrollHeight: u.Stream<number>
    smoothScrollTargetReached: u.Stream<true>
    react18ConcurrentRendering: u.StatefulStream<boolean>
    scrollTo: u.Stream<ScrollToOptions>
    scrollBy: u.Stream<ScrollToOptions>
    statefulScrollTop: u.StatefulStream<number>
    deviation: u.StatefulStream<number>
    scrollingInProgress: u.StatefulStream<boolean>
  }
>
//# sourceMappingURL=domIOSystem.d.ts.map
