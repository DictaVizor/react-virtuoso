export function simpleMemoize(func) {
  let called = false
  let result
  return () => {
    if (!called) {
      called = true
      result = func()
    }
    return result
  }
}
//# sourceMappingURL=simpleMemoize.js.map
