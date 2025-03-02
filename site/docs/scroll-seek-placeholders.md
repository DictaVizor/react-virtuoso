---
id: scroll-seek-placeholders
title: Scroll Seek Placeholders
sidebar_label: Scroll Seek Placeholders
slug: /scroll-seek-placeholders/
---

The `scrollSeekConfiguration` property allows you to render a placeholder element instead of the actual item if the user scrolls too fast.

This improves scrolling performance and delays the actual load of data from the server.

```jsx live include-data
import { Virtuoso } from 'react-virtuoso'
import { user, generateUsers, toggleBg } from './data'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'

export default function App() {
  const randomHeights = useMemo(
    () =>
      Array(10)
        .fill(true)
        .map(() => Math.round(Math.random() * 14) + 1),
    []
  )

  const users = useMemo(() => generateUsers(1000), [])

  // use the visible range to provide information
  // about the list current position.
  const [visibleRange, setVisibleRange] = useState(['-', '-'])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div>
        Current visible range:{' '}
        <div>
          <strong>
            {visibleRange[0]} - {visibleRange[1]}
          </strong>
        </div>{' '}
      </div>

      <div style={{ flex: 1 }}>
        <Virtuoso
          context={{ randomHeights }}
          style={{ height: 400 }}
          data={users}
          itemContent={(index, user) => <div style={{ backgroundColor: toggleBg(index) }}>{user.name}</div>}
          components={{ ScrollSeekPlaceholder }}
          scrollSeekConfiguration={{
            enter: (velocity) => Math.abs(velocity) > 50,
            exit: (velocity) => {
              const shouldExit = Math.abs(velocity) < 10
              if (shouldExit) {
                setVisibleRange(['-', '-'])
              }
              return shouldExit
            },
            change: (_velocity, { startIndex, endIndex }) => setVisibleRange([startIndex, endIndex]),
          }}
        />
      </div>
    </div>
  )
}

// You can use index to randomize
// and make the placeholder list more organic.
// the height passed is the one measured for the real item.
// the placeholder should be the same size.
const ScrollSeekPlaceholder = ({ height, index, context: { randomHeights } }) => (
  <div
    style={{
      height,
      padding: '8px',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        background: index % 2 ? 'blue' : 'green',
        height: randomHeights[index % 10],
      }}
    ></div>
  </div>
)
```
