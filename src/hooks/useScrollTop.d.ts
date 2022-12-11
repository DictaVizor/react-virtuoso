import { ScrollContainerState } from '../interfaces';
export declare type ScrollerRef = Window | HTMLElement | null;
export default function useScrollTop(scrollContainerStateCallback: (state: ScrollContainerState) => void, smoothScrollTargetReached: (yes: true) => void, scrollerElement: any, scrollerRefCallback?: (ref: ScrollerRef) => void, customScrollParent?: HTMLElement): {
    scrollerRef: import("react").MutableRefObject<HTMLElement | Window | null>;
    scrollByCallback: (location: ScrollToOptions) => void;
    scrollToCallback: (location: ScrollToOptions) => void;
};
//# sourceMappingURL=useScrollTop.d.ts.map