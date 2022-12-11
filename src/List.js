import { systemToComponent } from '@virtuoso.dev/react-urx'
import {
  compose,
  connect,
  getValue,
  map,
  pipe,
  publish,
  statefulStream,
  stream,
  subscribe,
  system,
  tup,
  withLatestFrom,
  statefulStreamFromEmitter,
  distinctUntilChanged,
  noop,
} from '@virtuoso.dev/urx'
import * as React from 'react'
import { createElement } from 'react'
import useIsomorphicLayoutEffect from './hooks/useIsomorphicLayoutEffect'
import useChangedListContentsSizes from './hooks/useChangedChildSizes'
import useScrollTop from './hooks/useScrollTop'
import useSize from './hooks/useSize'
import { listSystem } from './listSystem'
import { positionStickyCssValue } from './utils/positionStickyCssValue'
import useWindowViewportRectRef from './hooks/useWindowViewportRect'
import { correctItemSize } from './utils/correctItemSize'
export function identity(value) {
  return value
}
const listComponentPropsSystem = system(() => {
  const itemContent = statefulStream((index) => `Item ${index}`)
  const context = statefulStream(null)
  const groupContent = statefulStream((index) => `Group ${index}`)
  const components = statefulStream({})
  const computeItemKey = statefulStream(identity)
  const headerFooterTag = statefulStream('div')
  const scrollerRef = statefulStream(noop)
  const distinctProp = (propName, defaultValue = null) => {
    return statefulStreamFromEmitter(
      pipe(
        components,
        map((components) => components[propName]),
        distinctUntilChanged()
      ),
      defaultValue
    )
  }
  return {
    context,
    itemContent,
    groupContent,
    components,
    computeItemKey,
    headerFooterTag,
    scrollerRef,
    FooterComponent: distinctProp('Footer'),
    HeaderComponent: distinctProp('Header'),
    TopItemListComponent: distinctProp('TopItemList'),
    ListComponent: distinctProp('List', 'div'),
    ItemComponent: distinctProp('Item', 'div'),
    GroupComponent: distinctProp('Group', 'div'),
    ScrollerComponent: distinctProp('Scroller', 'div'),
    EmptyPlaceholder: distinctProp('EmptyPlaceholder'),
    ScrollSeekPlaceholder: distinctProp('ScrollSeekPlaceholder'),
  }
})
export function addDeprecatedAlias(prop, message) {
  const alias = stream()
  subscribe(alias, () =>
    console.warn(`react-virtuoso: You are using a deprecated property. ${message}`, 'color: red;', 'color: inherit;', 'color: blue;')
  )
  connect(alias, prop)
  return alias
}
const combinedSystem = system(([listSystem, propsSystem]) => {
  const deprecatedProps = {
    item: addDeprecatedAlias(propsSystem.itemContent, 'Rename the %citem%c prop to %citemContent.'),
    group: addDeprecatedAlias(propsSystem.groupContent, 'Rename the %cgroup%c prop to %cgroupContent.'),
    topItems: addDeprecatedAlias(listSystem.topItemCount, 'Rename the %ctopItems%c prop to %ctopItemCount.'),
    itemHeight: addDeprecatedAlias(listSystem.fixedItemHeight, 'Rename the %citemHeight%c prop to %cfixedItemHeight.'),
    scrollingStateChange: addDeprecatedAlias(listSystem.isScrolling, 'Rename the %cscrollingStateChange%c prop to %cisScrolling.'),
    adjustForPrependedItems: stream(),
    maxHeightCacheSize: stream(),
    footer: stream(),
    header: stream(),
    HeaderContainer: stream(),
    FooterContainer: stream(),
    ItemContainer: stream(),
    ScrollContainer: stream(),
    GroupContainer: stream(),
    ListContainer: stream(),
    emptyComponent: stream(),
    scrollSeek: stream(),
  }
  subscribe(deprecatedProps.adjustForPrependedItems, () => {
    console.warn(
      `react-virtuoso: adjustForPrependedItems is no longer supported. Use the firstItemIndex property instead - https://virtuoso.dev/prepend-items.`,
      'color: red;',
      'color: inherit;',
      'color: blue;'
    )
  })
  subscribe(deprecatedProps.maxHeightCacheSize, () => {
    console.warn(`react-virtuoso: maxHeightCacheSize is no longer necessary. Setting it has no effect - remove it from your code.`)
  })
  subscribe(deprecatedProps.HeaderContainer, () => {
    console.warn(
      `react-virtuoso: HeaderContainer is deprecated. Use headerFooterTag if you want to change the wrapper of the header component and pass components.Header to change its contents.`
    )
  })
  subscribe(deprecatedProps.FooterContainer, () => {
    console.warn(
      `react-virtuoso: FooterContainer is deprecated. Use headerFooterTag if you want to change the wrapper of the footer component and pass components.Footer to change its contents.`
    )
  })
  function deprecateComponentProp(stream, componentName, propName) {
    connect(
      pipe(
        stream,
        withLatestFrom(propsSystem.components),
        map(([comp, components]) => {
          console.warn(`react-virtuoso: ${propName} property is deprecated. Pass components.${componentName} instead.`)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          return { ...components, [componentName]: comp }
        })
      ),
      propsSystem.components
    )
  }
  subscribe(deprecatedProps.scrollSeek, ({ placeholder, ...config }) => {
    console.warn(
      `react-virtuoso: scrollSeek property is deprecated. Pass scrollSeekConfiguration and specify the placeholder in components.ScrollSeekPlaceholder instead.`
    )
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    publish(propsSystem.components, { ...getValue(propsSystem.components), ScrollSeekPlaceholder: placeholder })
    publish(listSystem.scrollSeekConfiguration, config)
  })
  deprecateComponentProp(deprecatedProps.footer, 'Footer', 'footer')
  deprecateComponentProp(deprecatedProps.header, 'Header', 'header')
  deprecateComponentProp(deprecatedProps.ItemContainer, 'Item', 'ItemContainer')
  deprecateComponentProp(deprecatedProps.ListContainer, 'List', 'ListContainer')
  deprecateComponentProp(deprecatedProps.ScrollContainer, 'Scroller', 'ScrollContainer')
  deprecateComponentProp(deprecatedProps.emptyComponent, 'EmptyPlaceholder', 'emptyComponent')
  deprecateComponentProp(deprecatedProps.GroupContainer, 'Group', 'GroupContainer')
  return { ...listSystem, ...propsSystem, ...deprecatedProps }
}, tup(listSystem, listComponentPropsSystem))
const DefaultScrollSeekPlaceholder = ({ height }) => React.createElement('div', { style: { height } })
const GROUP_STYLE = { position: positionStickyCssValue(), zIndex: 1, overflowAnchor: 'none' }
const ITEM_STYLE = { overflowAnchor: 'none' }
export const Items = React.memo(function VirtuosoItems({ showTopList = false }) {
  const listState = useEmitterValue('listState')
  const sizeRanges = usePublisher('sizeRanges')
  const useWindowScroll = useEmitterValue('useWindowScroll')
  const customScrollParent = useEmitterValue('customScrollParent')
  const windowScrollContainerStateCallback = usePublisher('windowScrollContainerState')
  const _scrollContainerStateCallback = usePublisher('scrollContainerState')
  const scrollContainerStateCallback =
    customScrollParent || useWindowScroll ? windowScrollContainerStateCallback : _scrollContainerStateCallback
  const itemContent = useEmitterValue('itemContent')
  const context = useEmitterValue('context')
  const groupContent = useEmitterValue('groupContent')
  const trackItemSizes = useEmitterValue('trackItemSizes')
  const itemSize = useEmitterValue('itemSize')
  const log = useEmitterValue('log')
  const { callbackRef, ref } = useChangedListContentsSizes(
    sizeRanges,
    itemSize,
    trackItemSizes,
    showTopList ? noop : scrollContainerStateCallback,
    log,
    customScrollParent
  )
  const [deviation, setDeviation] = React.useState(0)
  useEmitter('deviation', (value) => {
    if (deviation !== value) {
      ref.current.style.marginTop = `${value}px`
      setDeviation(value)
    }
  })
  const EmptyPlaceholder = useEmitterValue('EmptyPlaceholder')
  const ScrollSeekPlaceholder = useEmitterValue('ScrollSeekPlaceholder') || DefaultScrollSeekPlaceholder
  const ListComponent = useEmitterValue('ListComponent')
  const ItemComponent = useEmitterValue('ItemComponent')
  const GroupComponent = useEmitterValue('GroupComponent')
  const computeItemKey = useEmitterValue('computeItemKey')
  const isSeeking = useEmitterValue('isSeeking')
  const hasGroups = useEmitterValue('groupIndices').length > 0
  const paddingTopAddition = useEmitterValue('paddingTopAddition')
  const firstItemIndex = useEmitterValue('firstItemIndex')
  const statefulTotalCount = useEmitterValue('statefulTotalCount')
  const containerStyle = showTopList
    ? {}
    : {
        boxSizing: 'border-box',
        paddingTop: listState.offsetTop + paddingTopAddition,
        paddingBottom: listState.offsetBottom,
        marginTop: deviation,
      }
  if (!showTopList && statefulTotalCount === 0 && EmptyPlaceholder) {
    return createElement(EmptyPlaceholder, contextPropIfNotDomElement(EmptyPlaceholder, context))
  }
  return React.createElement(
    React.Fragment,
    null,
    createElement(
      ListComponent,
      {
        ...contextPropIfNotDomElement(ListComponent, context),
        ref: callbackRef,
        style: containerStyle,
        'data-test-id': showTopList ? 'virtuoso-top-item-list' : 'virtuoso-item-list',
      },
      (showTopList ? listState.topItems : listState.items).map((item) => {
        const index = item.originalIndex
        const key = computeItemKey(index + firstItemIndex, item.data, context)
        if (isSeeking) {
          return createElement(ScrollSeekPlaceholder, {
            ...contextPropIfNotDomElement(ScrollSeekPlaceholder, context),
            key,
            index: item.index,
            height: item.size,
            type: item.type || 'item',
            ...(item.type === 'group' ? {} : { groupIndex: item.groupIndex }),
          })
        }
        if (item.type === 'group') {
          return createElement(
            GroupComponent,
            {
              ...contextPropIfNotDomElement(GroupComponent, context),
              key,
              'data-index': index,
              'data-known-size': item.size,
              'data-item-index': item.index,
              style: GROUP_STYLE,
            },
            groupContent(item.index)
          )
        } else {
          return createElement(
            ItemComponent,
            {
              ...contextPropIfNotDomElement(ItemComponent, context),
              key,
              'data-index': index,
              'data-known-size': item.size,
              'data-item-index': item.index,
              'data-item-group-index': item.groupIndex,
              style: ITEM_STYLE,
            },
            hasGroups ? itemContent(item.index, item.groupIndex, item.data, context) : itemContent(item.index, item.data, context)
          )
        }
      })
    )
  )
})
export const scrollerStyle = {
  height: '100%',
  outline: 'none',
  overflowY: 'auto',
  position: 'relative',
  WebkitOverflowScrolling: 'touch',
}
export const viewportStyle = {
  width: '100%',
  height: '100%',
  position: 'absolute',
  top: 0,
}
const topItemListStyle = {
  width: '100%',
  position: positionStickyCssValue(),
  top: 0,
}
export function contextPropIfNotDomElement(element, context) {
  if (typeof element === 'string') {
    return undefined
  }
  return { context }
}
const Header = React.memo(function VirtuosoHeader() {
  const Header = useEmitterValue('HeaderComponent')
  const headerHeight = usePublisher('headerHeight')
  const headerFooterTag = useEmitterValue('headerFooterTag')
  const ref = useSize((el) => headerHeight(correctItemSize(el, 'height')))
  const context = useEmitterValue('context')
  return Header ? createElement(headerFooterTag, { ref }, createElement(Header, contextPropIfNotDomElement(Header, context))) : null
})
const Footer = React.memo(function VirtuosoFooter() {
  const Footer = useEmitterValue('FooterComponent')
  const footerHeight = usePublisher('footerHeight')
  const headerFooterTag = useEmitterValue('headerFooterTag')
  const ref = useSize((el) => footerHeight(correctItemSize(el, 'height')))
  const context = useEmitterValue('context')
  return Footer ? createElement(headerFooterTag, { ref }, createElement(Footer, contextPropIfNotDomElement(Footer, context))) : null
})
export function buildScroller({ usePublisher, useEmitter, useEmitterValue }) {
  const Scroller = React.memo(function VirtuosoScroller({ style, children, ...props }) {
    const scrollContainerStateCallback = usePublisher('scrollContainerState')
    const ScrollerComponent = useEmitterValue('ScrollerComponent')
    const smoothScrollTargetReached = usePublisher('smoothScrollTargetReached')
    const scrollerRefCallback = useEmitterValue('scrollerRef')
    const context = useEmitterValue('context')
    const { scrollerRef, scrollByCallback, scrollToCallback } = useScrollTop(
      scrollContainerStateCallback,
      smoothScrollTargetReached,
      ScrollerComponent,
      scrollerRefCallback
    )
    useEmitter('scrollTo', scrollToCallback)
    useEmitter('scrollBy', scrollByCallback)
    return createElement(
      ScrollerComponent,
      {
        ref: scrollerRef,
        style: { ...scrollerStyle, ...style },
        'data-test-id': 'virtuoso-scroller',
        'data-virtuoso-scroller': true,
        tabIndex: 0,
        ...props,
        ...contextPropIfNotDomElement(ScrollerComponent, context),
      },
      children
    )
  })
  return Scroller
}
export function buildWindowScroller({ usePublisher, useEmitter, useEmitterValue }) {
  const Scroller = React.memo(function VirtuosoWindowScroller({ style, children, ...props }) {
    const scrollContainerStateCallback = usePublisher('windowScrollContainerState')
    const ScrollerComponent = useEmitterValue('ScrollerComponent')
    const smoothScrollTargetReached = usePublisher('smoothScrollTargetReached')
    const totalListHeight = useEmitterValue('totalListHeight')
    const deviation = useEmitterValue('deviation')
    const customScrollParent = useEmitterValue('customScrollParent')
    const context = useEmitterValue('context')
    const { scrollerRef, scrollByCallback, scrollToCallback } = useScrollTop(
      scrollContainerStateCallback,
      smoothScrollTargetReached,
      ScrollerComponent,
      noop,
      customScrollParent
    )
    useIsomorphicLayoutEffect(() => {
      scrollerRef.current = customScrollParent ? customScrollParent : window
      return () => {
        scrollerRef.current = null
      }
    }, [scrollerRef, customScrollParent])
    useEmitter('windowScrollTo', scrollToCallback)
    useEmitter('scrollBy', scrollByCallback)
    return createElement(
      ScrollerComponent,
      {
        style: { position: 'relative', ...style, ...(totalListHeight !== 0 ? { height: totalListHeight + deviation } : {}) },
        'data-virtuoso-scroller': true,
        ...props,
        ...contextPropIfNotDomElement(ScrollerComponent, context),
      },
      children
    )
  })
  return Scroller
}
const Viewport = ({ children }) => {
  const viewportHeight = usePublisher('viewportHeight')
  const viewportRef = useSize(compose(viewportHeight, (el) => correctItemSize(el, 'height')))
  return React.createElement('div', { style: viewportStyle, ref: viewportRef, 'data-viewport-type': 'element' }, children)
}
const WindowViewport = ({ children }) => {
  const windowViewportRect = usePublisher('windowViewportRect')
  const customScrollParent = useEmitterValue('customScrollParent')
  const viewportRef = useWindowViewportRectRef(windowViewportRect, customScrollParent)
  return React.createElement('div', { ref: viewportRef, style: viewportStyle, 'data-viewport-type': 'window' }, children)
}
const TopItemListContainer = ({ children }) => {
  const TopItemList = useEmitterValue('TopItemListComponent')
  const headerHeight = useEmitterValue('headerHeight')
  const style = { ...topItemListStyle, marginTop: `${headerHeight}px` }
  const context = useEmitterValue('context')
  return createElement(TopItemList || 'div', { style, context }, children)
}
const ListRoot = React.memo(function VirtuosoRoot(props) {
  const useWindowScroll = useEmitterValue('useWindowScroll')
  const showTopList = useEmitterValue('topItemsIndexes').length > 0
  const customScrollParent = useEmitterValue('customScrollParent')
  const TheScroller = customScrollParent || useWindowScroll ? WindowScroller : Scroller
  const TheViewport = customScrollParent || useWindowScroll ? WindowViewport : Viewport
  return React.createElement(
    TheScroller,
    { ...props },
    React.createElement(
      TheViewport,
      null,
      React.createElement(Header, null),
      React.createElement(Items, null),
      React.createElement(Footer, null)
    ),
    showTopList && React.createElement(TopItemListContainer, null, React.createElement(Items, { showTopList: true }))
  )
})
export const {
  Component: List,
  usePublisher,
  useEmitterValue,
  useEmitter,
} = systemToComponent(
  combinedSystem,
  {
    required: {},
    optional: {
      context: 'context',
      followOutput: 'followOutput',
      firstItemIndex: 'firstItemIndex',
      itemContent: 'itemContent',
      groupContent: 'groupContent',
      overscan: 'overscan',
      increaseViewportBy: 'increaseViewportBy',
      totalCount: 'totalCount',
      topItemCount: 'topItemCount',
      initialTopMostItemIndex: 'initialTopMostItemIndex',
      components: 'components',
      groupCounts: 'groupCounts',
      atBottomThreshold: 'atBottomThreshold',
      atTopThreshold: 'atTopThreshold',
      computeItemKey: 'computeItemKey',
      defaultItemHeight: 'defaultItemHeight',
      fixedItemHeight: 'fixedItemHeight',
      itemSize: 'itemSize',
      scrollSeekConfiguration: 'scrollSeekConfiguration',
      headerFooterTag: 'headerFooterTag',
      data: 'data',
      initialItemCount: 'initialItemCount',
      initialScrollTop: 'initialScrollTop',
      alignToBottom: 'alignToBottom',
      useWindowScroll: 'useWindowScroll',
      customScrollParent: 'customScrollParent',
      scrollerRef: 'scrollerRef',
      logLevel: 'logLevel',
      react18ConcurrentRendering: 'react18ConcurrentRendering',
      customStartIndex: 'customStartIndex',
      keepIndexRendered: 'keepIndexRendered',
      // deprecated
      item: 'item',
      group: 'group',
      topItems: 'topItems',
      itemHeight: 'itemHeight',
      scrollingStateChange: 'scrollingStateChange',
      maxHeightCacheSize: 'maxHeightCacheSize',
      footer: 'footer',
      header: 'header',
      ItemContainer: 'ItemContainer',
      ScrollContainer: 'ScrollContainer',
      ListContainer: 'ListContainer',
      GroupContainer: 'GroupContainer',
      emptyComponent: 'emptyComponent',
      HeaderContainer: 'HeaderContainer',
      FooterContainer: 'FooterContainer',
      scrollSeek: 'scrollSeek',
    },
    methods: {
      scrollToIndex: 'scrollToIndex',
      scrollIntoView: 'scrollIntoView',
      scrollTo: 'scrollTo',
      scrollBy: 'scrollBy',
      adjustForPrependedItems: 'adjustForPrependedItems',
    },
    events: {
      isScrolling: 'isScrolling',
      endReached: 'endReached',
      startReached: 'startReached',
      rangeChanged: 'rangeChanged',
      atBottomStateChange: 'atBottomStateChange',
      atTopStateChange: 'atTopStateChange',
      totalListHeightChanged: 'totalListHeightChanged',
      itemsRendered: 'itemsRendered',
      groupIndices: 'groupIndices',
    },
  },
  ListRoot
)
const Scroller = buildScroller({ usePublisher, useEmitterValue, useEmitter })
const WindowScroller = buildWindowScroller({ usePublisher, useEmitterValue, useEmitter })
//# sourceMappingURL=List.js.map
