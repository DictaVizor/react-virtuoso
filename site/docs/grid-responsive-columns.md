---
id: grid-responsive-columns
title: Grid with Responsive Columns
sidebar_label: Responsive Columns
slug: /grid-responsive-columns/
---

The `VirtuosoGrid` component displays **equally-sized items**, while supporting multiple items per row.

The component provides no styling out of the box.
The styling and the layout of the items is be specified by passing two properties - `itemClassName` and `listClassName`.

Alternatively, you can use styled components and pass them as `components.Item` and `components.List`.

Either way, it is up to you to implement the layout with Flexbox or CSS grid. You can use plain old CSS or CSS in JS - the example uses Emotion.

### Responsive Layout

You can safely use media queries, `min-width`, percentages, etc. In the item layout definitions.
The grid observes the container/item dimensions and recalculates the scroll size accordingly.

Load the example below in codesandbox, resize, and scroll around - the items reposition correctly.

```jsx live import=@emotion/styled
import { VirtuosoGrid } from 'react-virtuoso'
import styled from '@emotion/styled'

const ItemContainer = styled.div`
  padding: 0.5rem;
  width: 33%;
  display: flex;
  flex: none;
  align-content: stretch;
  box-sizing: border-box;

  @media (max-width: 1024px) {
    width: 50%;
  }

  @media (max-width: 300px) {
    width: 100%;
  }
`

const ItemWrapper = styled.div`
  flex: 1;
  text-align: center;
  font-size: 80%;
  padding: 1rem 1rem;
  border: 1px solid var(gray);
  white-space: nowrap;
`

const ListContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
`

export default function App() {
  return (
    <>
      <VirtuosoGrid
        style={{ height: 400 }}
        totalCount={10000}
        overscan={200}
        components={{
          Item: ItemContainer,
          List: ListContainer,
          ScrollSeekPlaceholder: ({ height, width, index }) => (
            <ItemContainer>
              <ItemWrapper>{'--'}</ItemWrapper>
            </ItemContainer>
          ),
        }}
        itemContent={(index) => <ItemWrapper>Item {index}</ItemWrapper>}
        scrollSeekConfiguration={{
          enter: (velocity) => Math.abs(velocity) > 200,
          exit: (velocity) => Math.abs(velocity) < 30,
          change: (_, range) => console.log({ range }),
        }}
      />
      <style>{`html, body, #root { margin: 0; padding: 0 }`}</style>
    </>
  )
}
```
