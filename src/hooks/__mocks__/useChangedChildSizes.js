export default function useChangedChildSizes(callback) {
    const callbackRef = (elRef) => {
        if (elRef) {
            ;
            elRef.triggerChangedChildSizes = (sizes) => {
                callback(sizes);
            };
        }
    };
    return { callbackRef };
}
//# sourceMappingURL=useChangedChildSizes.js.map