import { systemToComponent } from '@virtuoso.dev/react-urx';
import { map, pipe, statefulStream, system, tup, statefulStreamFromEmitter, distinctUntilChanged, noop, compose } from '@virtuoso.dev/urx';
import * as React from 'react';
import { createElement } from 'react';
import useChangedListContentsSizes from './hooks/useChangedChildSizes';
import { listSystem } from './listSystem';
import { identity, buildScroller, buildWindowScroller, viewportStyle, contextPropIfNotDomElement } from './List';
import useSize from './hooks/useSize';
import { correctItemSize } from './utils/correctItemSize';
import useWindowViewportRectRef from './hooks/useWindowViewportRect';
const tableComponentPropsSystem = system(() => {
    const itemContent = statefulStream((index) => React.createElement("td", null,
        "Item $",
        index));
    const context = statefulStream(null);
    const fixedHeaderContent = statefulStream(null);
    const components = statefulStream({});
    const computeItemKey = statefulStream(identity);
    const scrollerRef = statefulStream(noop);
    const distinctProp = (propName, defaultValue = null) => {
        return statefulStreamFromEmitter(pipe(components, map((components) => components[propName]), distinctUntilChanged()), defaultValue);
    };
    return {
        context,
        itemContent,
        fixedHeaderContent,
        components,
        computeItemKey,
        scrollerRef,
        TableComponent: distinctProp('Table', 'table'),
        TableHeadComponent: distinctProp('TableHead', 'thead'),
        TableBodyComponent: distinctProp('TableBody', 'tbody'),
        TableRowComponent: distinctProp('TableRow', 'tr'),
        ScrollerComponent: distinctProp('Scroller', 'div'),
        EmptyPlaceholder: distinctProp('EmptyPlaceholder'),
        ScrollSeekPlaceholder: distinctProp('ScrollSeekPlaceholder'),
        FillerRow: distinctProp('FillerRow'),
    };
});
const combinedSystem = system(([listSystem, propsSystem]) => {
    return { ...listSystem, ...propsSystem };
}, tup(listSystem, tableComponentPropsSystem));
const DefaultScrollSeekPlaceholder = ({ height }) => (React.createElement("tr", null,
    React.createElement("td", { style: { height } })));
const DefaultFillerRow = ({ height }) => (React.createElement("tr", null,
    React.createElement("td", { style: { height: height, padding: 0, border: 0 } })));
export const Items = React.memo(function VirtuosoItems() {
    const listState = useEmitterValue('listState');
    const sizeRanges = usePublisher('sizeRanges');
    const useWindowScroll = useEmitterValue('useWindowScroll');
    const customScrollParent = useEmitterValue('customScrollParent');
    const windowScrollContainerStateCallback = usePublisher('windowScrollContainerState');
    const _scrollContainerStateCallback = usePublisher('scrollContainerState');
    const scrollContainerStateCallback = customScrollParent || useWindowScroll ? windowScrollContainerStateCallback : _scrollContainerStateCallback;
    const itemContent = useEmitterValue('itemContent');
    const trackItemSizes = useEmitterValue('trackItemSizes');
    const itemSize = useEmitterValue('itemSize');
    const log = useEmitterValue('log');
    const { callbackRef, ref } = useChangedListContentsSizes(sizeRanges, itemSize, trackItemSizes, scrollContainerStateCallback, log, customScrollParent);
    const [deviation, setDeviation] = React.useState(0);
    useEmitter('deviation', (value) => {
        if (deviation !== value) {
            ref.current.style.marginTop = `${value}px`;
            setDeviation(value);
        }
    });
    const EmptyPlaceholder = useEmitterValue('EmptyPlaceholder');
    const ScrollSeekPlaceholder = useEmitterValue('ScrollSeekPlaceholder') || DefaultScrollSeekPlaceholder;
    const FillerRow = useEmitterValue('FillerRow') || DefaultFillerRow;
    const TableBodyComponent = useEmitterValue('TableBodyComponent');
    const TableRowComponent = useEmitterValue('TableRowComponent');
    const computeItemKey = useEmitterValue('computeItemKey');
    const isSeeking = useEmitterValue('isSeeking');
    const paddingTopAddition = useEmitterValue('paddingTopAddition');
    const firstItemIndex = useEmitterValue('firstItemIndex');
    const statefulTotalCount = useEmitterValue('statefulTotalCount');
    const context = useEmitterValue('context');
    if (statefulTotalCount === 0 && EmptyPlaceholder) {
        return createElement(EmptyPlaceholder, contextPropIfNotDomElement(EmptyPlaceholder, context));
    }
    const paddingTop = listState.offsetTop + paddingTopAddition + deviation;
    const paddingBottom = listState.offsetBottom;
    const paddingTopEl = paddingTop > 0 ? React.createElement(FillerRow, { height: paddingTop, key: "padding-top" }) : null;
    const paddingBottomEl = paddingBottom > 0 ? React.createElement(FillerRow, { height: paddingBottom, key: "padding-bottom" }) : null;
    const items = listState.items.map((item) => {
        const index = item.originalIndex;
        const key = computeItemKey(index + firstItemIndex, item.data, context);
        if (isSeeking) {
            return createElement(ScrollSeekPlaceholder, {
                ...contextPropIfNotDomElement(ScrollSeekPlaceholder, context),
                key,
                index: item.index,
                height: item.size,
                type: item.type || 'item',
            });
        }
        return createElement(TableRowComponent, {
            ...contextPropIfNotDomElement(TableRowComponent, context),
            key,
            'data-index': index,
            'data-known-size': item.size,
            'data-item-index': item.index,
            style: { overflowAnchor: 'none' },
        }, itemContent(item.index, item.data, context));
    });
    return createElement(TableBodyComponent, { ref: callbackRef, 'data-test-id': 'virtuoso-item-list', ...contextPropIfNotDomElement(TableBodyComponent, context) }, [paddingTopEl, ...items, paddingBottomEl]);
});
const Viewport = ({ children }) => {
    const viewportHeight = usePublisher('viewportHeight');
    const viewportRef = useSize(compose(viewportHeight, (el) => correctItemSize(el, 'height')));
    return (React.createElement("div", { style: viewportStyle, ref: viewportRef, "data-viewport-type": "element" }, children));
};
const WindowViewport = ({ children }) => {
    const windowViewportRect = usePublisher('windowViewportRect');
    const customScrollParent = useEmitterValue('customScrollParent');
    const viewportRef = useWindowViewportRectRef(windowViewportRect, customScrollParent);
    return (React.createElement("div", { ref: viewportRef, style: viewportStyle, "data-viewport-type": "window" }, children));
};
const TableRoot = React.memo(function TableVirtuosoRoot(props) {
    const useWindowScroll = useEmitterValue('useWindowScroll');
    const customScrollParent = useEmitterValue('customScrollParent');
    const fixedHeaderHeight = usePublisher('fixedHeaderHeight');
    const fixedHeaderContent = useEmitterValue('fixedHeaderContent');
    const context = useEmitterValue('context');
    const theadRef = useSize(compose(fixedHeaderHeight, (el) => correctItemSize(el, 'height')));
    const TheScroller = customScrollParent || useWindowScroll ? WindowScroller : Scroller;
    const TheViewport = customScrollParent || useWindowScroll ? WindowViewport : Viewport;
    const TheTable = useEmitterValue('TableComponent');
    const TheTHead = useEmitterValue('TableHeadComponent');
    const theHead = fixedHeaderContent
        ? React.createElement(TheTHead, {
            key: 'TableHead',
            style: { zIndex: 1, position: 'sticky', top: 0 },
            ref: theadRef,
            ...contextPropIfNotDomElement(TheTHead, context),
        }, fixedHeaderContent())
        : null;
    return (React.createElement(TheScroller, { ...props },
        React.createElement(TheViewport, null, React.createElement(TheTable, { style: { borderSpacing: 0 }, ...contextPropIfNotDomElement(TheTable, context) }, [
            theHead,
            React.createElement(Items, { key: "TableBody" }),
        ]))));
});
export const { Component: Table, usePublisher, useEmitterValue, useEmitter, } = systemToComponent(combinedSystem, {
    required: {},
    optional: {
        context: 'context',
        followOutput: 'followOutput',
        firstItemIndex: 'firstItemIndex',
        itemContent: 'itemContent',
        fixedHeaderContent: 'fixedHeaderContent',
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
        data: 'data',
        initialItemCount: 'initialItemCount',
        initialScrollTop: 'initialScrollTop',
        alignToBottom: 'alignToBottom',
        useWindowScroll: 'useWindowScroll',
        customScrollParent: 'customScrollParent',
        scrollerRef: 'scrollerRef',
        logLevel: 'logLevel',
        react18ConcurrentRendering: 'react18ConcurrentRendering',
    },
    methods: {
        scrollToIndex: 'scrollToIndex',
        scrollIntoView: 'scrollIntoView',
        scrollTo: 'scrollTo',
        scrollBy: 'scrollBy',
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
}, TableRoot);
const Scroller = buildScroller({ usePublisher, useEmitterValue, useEmitter });
const WindowScroller = buildWindowScroller({ usePublisher, useEmitterValue, useEmitter });
//# sourceMappingURL=Table.js.map