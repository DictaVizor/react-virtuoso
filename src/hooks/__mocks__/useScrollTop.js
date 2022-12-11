export default function useSize(callback) {
    const scrollerRef = (elRef) => {
        if (elRef) {
            ;
            elRef.triggerScroll = (state) => {
                callback(state);
            };
        }
    };
    return { scrollerRef, scrollByCallback: () => { }, scrollToCallback: () => { } };
}
//# sourceMappingURL=useScrollTop.js.map