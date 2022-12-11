import { Log } from '../loggerSystem';
import { SizeFunction, SizeRange } from '../sizeSystem';
import { ScrollContainerState } from '../interfaces';
export default function useChangedListContentsSizes(callback: (ranges: SizeRange[]) => void, itemSize: SizeFunction, enabled: boolean, scrollContainerStateCallback: (state: ScrollContainerState) => void, log: Log, customScrollParent?: HTMLElement): {
    ref: import("react").MutableRefObject<import("./useSize").CallbackRefParam>;
    callbackRef: (_el: import("./useSize").CallbackRefParam) => void;
};
//# sourceMappingURL=useChangedChildSizes.d.ts.map