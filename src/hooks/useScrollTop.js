import { useRef, useCallback, useEffect } from 'react';
import * as u from '@virtuoso.dev/urx';
import { correctItemSize } from '../utils/correctItemSize';
function approximatelyEqual(num1, num2) {
    return Math.abs(num1 - num2) < 1.01;
}
export default function useScrollTop(scrollContainerStateCallback, smoothScrollTargetReached, scrollerElement, scrollerRefCallback = u.noop, customScrollParent) {
    const scrollerRef = useRef(null);
    const scrollTopTarget = useRef(null);
    const timeoutRef = useRef(null);
    const handler = useCallback((ev) => {
        const el = ev.target;
        const scrollTop = el === window || el === document ? window.pageYOffset || document.documentElement.scrollTop : el.scrollTop;
        const scrollHeight = el === window ? document.documentElement.scrollHeight : el.scrollHeight;
        const viewportHeight = el === window ? window.innerHeight : el.offsetHeight;
        scrollContainerStateCallback({
            scrollTop: Math.max(scrollTop, 0),
            scrollHeight,
            viewportHeight,
        });
        if (scrollTopTarget.current !== null) {
            if (scrollTop === scrollTopTarget.current || scrollTop <= 0 || scrollTop === el.scrollHeight - correctItemSize(el, 'height')) {
                scrollTopTarget.current = null;
                smoothScrollTargetReached(true);
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
            }
        }
    }, [scrollContainerStateCallback, smoothScrollTargetReached]);
    useEffect(() => {
        const localRef = customScrollParent ? customScrollParent : scrollerRef.current;
        scrollerRefCallback(customScrollParent ? customScrollParent : scrollerRef.current);
        handler({ target: localRef });
        localRef.addEventListener('scroll', handler, { passive: true });
        return () => {
            scrollerRefCallback(null);
            localRef.removeEventListener('scroll', handler);
        };
    }, [scrollerRef, handler, scrollerElement, scrollerRefCallback, customScrollParent]);
    function scrollToCallback(location) {
        const scrollerElement = scrollerRef.current;
        if (!scrollerElement || ('offsetHeight' in scrollerElement && scrollerElement.offsetHeight === 0)) {
            return;
        }
        const isSmooth = location.behavior === 'smooth';
        let offsetHeight;
        let scrollHeight;
        let scrollTop;
        if (scrollerElement === window) {
            // this is not a mistake
            scrollHeight = Math.max(correctItemSize(document.documentElement, 'height'), document.documentElement.scrollHeight);
            offsetHeight = window.innerHeight;
            scrollTop = document.documentElement.scrollTop;
        }
        else {
            scrollHeight = scrollerElement.scrollHeight;
            offsetHeight = correctItemSize(scrollerElement, 'height');
            scrollTop = scrollerElement.scrollTop;
        }
        const maxScrollTop = scrollHeight - offsetHeight;
        location.top = Math.ceil(Math.max(Math.min(maxScrollTop, location.top), 0));
        // avoid system hanging because the DOM never called back
        // with the scrollTop
        // scroller is already at this location
        if (approximatelyEqual(offsetHeight, scrollHeight) || location.top === scrollTop) {
            scrollContainerStateCallback({ scrollTop, scrollHeight, viewportHeight: offsetHeight });
            if (isSmooth) {
                smoothScrollTargetReached(true);
            }
            return;
        }
        if (isSmooth) {
            scrollTopTarget.current = location.top;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                timeoutRef.current = null;
                scrollTopTarget.current = null;
                smoothScrollTargetReached(true);
            }, 1000);
        }
        else {
            scrollTopTarget.current = null;
        }
        scrollerElement.scrollTo(location);
    }
    function scrollByCallback(location) {
        scrollerRef.current.scrollBy(location);
    }
    return { scrollerRef, scrollByCallback, scrollToCallback };
}
//# sourceMappingURL=useScrollTop.js.map