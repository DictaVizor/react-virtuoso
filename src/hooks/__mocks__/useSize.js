export default function useSize(callback) {
    const callbackRef = (elRef) => {
        if (elRef) {
            ;
            elRef.triggerResize = (state) => {
                callback({ ...elRef, ...state });
            };
        }
    };
    return callbackRef;
}
//# sourceMappingURL=useSize.js.map