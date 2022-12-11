import { LogLevel } from '../loggerSystem';
import { useSizeWithElRef } from './useSize';
export default function useChangedListContentsSizes(callback, itemSize, enabled, scrollContainerStateCallback, log, customScrollParent) {
    return useSizeWithElRef((el) => {
        const ranges = getChangedChildSizes(el.children, itemSize, 'offsetHeight', log);
        let scrollableElement = el.parentElement;
        while (!scrollableElement.dataset['virtuosoScroller']) {
            scrollableElement = scrollableElement.parentElement;
        }
        const scrollTop = customScrollParent
            ? customScrollParent.scrollTop
            : // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                scrollableElement.firstElementChild.dataset['viewportType'] === 'window'
                    ? window.pageYOffset || document.documentElement.scrollTop
                    : scrollableElement.scrollTop;
        scrollContainerStateCallback({
            scrollTop: Math.max(scrollTop, 0),
            scrollHeight: (customScrollParent ?? scrollableElement).scrollHeight,
            viewportHeight: (customScrollParent ?? scrollableElement).offsetHeight,
        });
        if (ranges !== null) {
            callback(ranges);
        }
    }, enabled);
}
function getChangedChildSizes(children, itemSize, field, log) {
    const length = children.length;
    if (length === 0) {
        return null;
    }
    const results = [];
    for (let i = 0; i < length; i++) {
        const child = children.item(i);
        if (!child || child.dataset.index === undefined) {
            continue;
        }
        const index = parseInt(child.dataset.index);
        const knownSize = parseFloat(child.dataset.knownSize);
        const size = itemSize(child, field);
        if (size === 0) {
            log('Zero-sized element, this should not happen', { child }, LogLevel.ERROR);
        }
        if (size === knownSize) {
            continue;
        }
        const lastResult = results[results.length - 1];
        if (results.length === 0 || lastResult.size !== size || lastResult.endIndex !== index - 1) {
            results.push({ startIndex: index, endIndex: index, size });
        }
        else {
            results[results.length - 1].endIndex++;
        }
    }
    return results;
}
//# sourceMappingURL=useChangedChildSizes.js.map