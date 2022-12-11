import { useRef } from 'react'
export function useSizeWithElRef(callback, enabled = true) {
  const ref = useRef(null)
  let callbackRef = (_el) => {
    void 0
  }
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver((entries) => {
      const element = entries[0].target
      if (element.offsetParent !== null) {
        callback(element)
      }
    })
    callbackRef = (elRef) => {
      if (elRef && enabled) {
        observer.observe(elRef)
        ref.current = elRef
      } else {
        if (ref.current) {
          observer.unobserve(ref.current)
        }
        ref.current = null
      }
    }
  }
  return { ref, callbackRef }
}
export default function useSize(callback, enabled = true) {
  return useSizeWithElRef(callback, enabled).callbackRef
}
//# sourceMappingURL=useSize.js.map
