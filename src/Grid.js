import { systemToComponent } from '@virtuoso.dev/react-urx';
import * as u from '@virtuoso.dev/urx';
import * as React from 'react';
import { createElement } from 'react';
import { gridSystem } from './gridSystem';
import useSize from './hooks/useSize';
import useWindowViewportRectRef from './hooks/useWindowViewportRect';
import { addDeprecatedAlias, buildScroller, buildWindowScroller, contextPropIfNotDomElement, identity, viewportStyle } from './List';
const gridComponentPropsSystem = u.system(() => {
    const itemContent = u.statefulStream((index) => `Item ${index}`);
    const components = u.statefulStream({});
    const context = u.statefulStream(null);
    const itemClassName = u.statefulStream('virtuoso-grid-item');
    const listClassName = u.statefulStream('virtuoso-grid-list');
    const computeItemKey = u.statefulStream(identity);
    const scrollerRef = u.statefulStream(u.noop);
    const distinctProp = (propName, defaultValue = null) => {
        return u.statefulStreamFromEmitter(u.pipe(components, u.map((components) => components[propName]), u.distinctUntilChanged()), defaultValue);
    };
    return {
        context,
        itemContent,
        components,
        computeItemKey,
        itemClassName,
        listClassName,
        scrollerRef,
        ListComponent: distinctProp('List', 'div'),
        ItemComponent: distinctProp('Item', 'div'),
        ScrollerComponent: distinctProp('Scroller', 'div'),
        ScrollSeekPlaceholder: distinctProp('ScrollSeekPlaceholder', 'div'),
    };
});
const combinedSystem = u.system(([gridSystem, gridComponentPropsSystem]) => {
    const deprecatedProps = {
        item: addDeprecatedAlias(gridComponentPropsSystem.itemContent, 'Rename the %citem%c prop to %citemContent.'),
        ItemContainer: u.stream(),
        ScrollContainer: u.stream(),
        ListContainer: u.stream(),
        emptyComponent: u.stream(),
        scrollSeek: u.stream(),
    };
    function deprecateComponentProp(stream, componentName, propName) {
        u.connect(u.pipe(stream, u.withLatestFrom(gridComponentPropsSystem.components), u.map(([comp, components]) => {
            console.warn(`react-virtuoso: ${propName} property is deprecated. Pass components.${componentName} instead.`);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            return { ...components, [componentName]: comp };
        })), gridComponentPropsSystem.components);
    }
    u.subscribe(deprecatedProps.scrollSeek, ({ placeholder, ...config }) => {
        console.warn(`react-virtuoso: scrollSeek property is deprecated. Pass scrollSeekConfiguration and specify the placeholder in components.ScrollSeekPlaceholder instead.`);
        u.publish(gridComponentPropsSystem.components, {
            ...u.getValue(gridComponentPropsSystem.components),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            ScrollSeekPlaceholder: placeholder,
        });
        u.publish(gridSystem.scrollSeekConfiguration, config);
    });
    deprecateComponentProp(deprecatedProps.ItemContainer, 'Item', 'ItemContainer');
    deprecateComponentProp(deprecatedProps.ListContainer, 'List', 'ListContainer');
    deprecateComponentProp(deprecatedProps.ScrollContainer, 'Scroller', 'ScrollContainer');
    return { ...gridSystem, ...gridComponentPropsSystem, ...deprecatedProps };
}, u.tup(gridSystem, gridComponentPropsSystem));
const GridItems = React.memo(function GridItems() {
    const gridState = useEmitterValue('gridState');
    const listClassName = useEmitterValue('listClassName');
    const itemClassName = useEmitterValue('itemClassName');
    const itemContent = useEmitterValue('itemContent');
    const computeItemKey = useEmitterValue('computeItemKey');
    const isSeeking = useEmitterValue('isSeeking');
    const scrollHeightCallback = usePublisher('scrollHeight');
    const ItemComponent = useEmitterValue('ItemComponent');
    const ListComponent = useEmitterValue('ListComponent');
    const ScrollSeekPlaceholder = useEmitterValue('ScrollSeekPlaceholder');
    const context = useEmitterValue('context');
    const itemDimensions = usePublisher('itemDimensions');
    const listRef = useSize((el) => {
        const scrollHeight = el.parentElement.parentElement.scrollHeight;
        scrollHeightCallback(scrollHeight);
        const firstItem = el.firstChild;
        if (firstItem) {
            itemDimensions(firstItem.getBoundingClientRect());
        }
    });
    return createElement(ListComponent, {
        ref: listRef,
        className: listClassName,
        ...contextPropIfNotDomElement(ListComponent, context),
        style: { paddingTop: gridState.offsetTop, paddingBottom: gridState.offsetBottom },
    }, gridState.items.map((item) => {
        const key = computeItemKey(item.index);
        return isSeeking
            ? createElement(ScrollSeekPlaceholder, {
                key,
                ...contextPropIfNotDomElement(ScrollSeekPlaceholder, context),
                index: item.index,
                height: gridState.itemHeight,
                width: gridState.itemWidth,
            })
            : createElement(ItemComponent, { ...contextPropIfNotDomElement(ItemComponent, context), className: itemClassName, 'data-index': item.index, key }, itemContent(item.index, context));
    }));
});
const Viewport = ({ children }) => {
    const viewportDimensions = usePublisher('viewportDimensions');
    const viewportRef = useSize((el) => {
        viewportDimensions(el.getBoundingClientRect());
    });
    return (React.createElement("div", { style: viewportStyle, ref: viewportRef }, children));
};
const WindowViewport = ({ children }) => {
    const windowViewportRect = usePublisher('windowViewportRect');
    const customScrollParent = useEmitterValue('customScrollParent');
    const viewportRef = useWindowViewportRectRef(windowViewportRect, customScrollParent);
    return (React.createElement("div", { ref: viewportRef, style: viewportStyle }, children));
};
const GridRoot = React.memo(function GridRoot({ ...props }) {
    const useWindowScroll = useEmitterValue('useWindowScroll');
    const customScrollParent = useEmitterValue('customScrollParent');
    const TheScroller = customScrollParent || useWindowScroll ? WindowScroller : Scroller;
    const TheViewport = customScrollParent || useWindowScroll ? WindowViewport : Viewport;
    return (React.createElement(TheScroller, { ...props },
        React.createElement(TheViewport, null,
            React.createElement(GridItems, null))));
});
const { Component: Grid, usePublisher, useEmitterValue, useEmitter, } = systemToComponent(combinedSystem, {
    optional: {
        totalCount: 'totalCount',
        overscan: 'overscan',
        itemContent: 'itemContent',
        components: 'components',
        computeItemKey: 'computeItemKey',
        initialItemCount: 'initialItemCount',
        scrollSeekConfiguration: 'scrollSeekConfiguration',
        listClassName: 'listClassName',
        itemClassName: 'itemClassName',
        useWindowScroll: 'useWindowScroll',
        customScrollParent: 'customScrollParent',
        scrollerRef: 'scrollerRef',
        // deprecated
        item: 'item',
        ItemContainer: 'ItemContainer',
        ScrollContainer: 'ScrollContainer',
        ListContainer: 'ListContainer',
        scrollSeek: 'scrollSeek',
    },
    methods: {
        scrollTo: 'scrollTo',
        scrollBy: 'scrollBy',
        scrollToIndex: 'scrollToIndex',
    },
    events: {
        isScrolling: 'isScrolling',
        endReached: 'endReached',
        startReached: 'startReached',
        rangeChanged: 'rangeChanged',
        atBottomStateChange: 'atBottomStateChange',
        atTopStateChange: 'atTopStateChange',
    },
}, GridRoot);
export { Grid };
const Scroller = buildScroller({ usePublisher, useEmitterValue, useEmitter });
const WindowScroller = buildWindowScroller({ usePublisher, useEmitterValue, useEmitter });
//# sourceMappingURL=Grid.js.map