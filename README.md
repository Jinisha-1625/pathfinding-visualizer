# PathFinding Visualizer

A small browser-based pathfinding visualizer built with plain HTML, CSS, and
JavaScript (no frameworks, no build step -- just open the HTML file). Draw
walls, set weighted cells, move Start/End around, and watch BFS,
Dijkstra's Algorithm, and A* Search race across the grid.

## Demo

Open `index.html` in any modern browser. That's it, there's nothing to
install or build.

## Features

- **3 algorithms**: Breadth-First Search, Dijkstra's Algorithm, and A*
  Search, all implemented from scratch (Dijkstra and A* use a real binary
  min-heap priority queue, not just an array that gets re-sorted every
  loop).
- **Weighted cells**: click into any cell and type a number (1-99) to make
  it more expensive to walk through. Darker red = more expensive.
- **Walls**: turn on Wall Mode and click or drag across the grid to draw
  walls. Walls can't be crossed at all (infinite cost), so it's entirely
  possible to seal off the End cell completely -- if that happens, the
  visualizer tells you no path could be found instead of pretending
  everything's fine.
- **Diagonal movement**: all 8 directions are allowed, not just up/down/
  left/right. Diagonal steps cost a little more (`sqrt(2)` times the
  cell's weight) since they cover more actual distance, and the
  visualizer won't let you cut diagonally through the corner of two
  touching walls (that would look like walking through a closed gate).
- **Draggable Start/End**: grab the green (Start) or red (End) square and
  drop it anywhere else on the board.
- **Stats panel**: once the algorithm finishes AND the animation finishes
  playing, you get time taken, nodes visited, path length, and total path
  cost -- or a clear "no path found" message if walls blocked the way.

## How to use it

1. Pick an algorithm from the dropdown.
2. (Optional) Click into cells and type a weight from 1-99 to make
   terrain more expensive.
3. (Optional) Click "Wall Mode: OFF" to turn it on, then click/drag over
   cells to draw walls. Click it again to turn Wall Mode back off so you
   can go back to typing weights.
4. (Optional) Drag the green Start square or red End square somewhere
   else.
5. Hit "Start Search" and watch it go.
6. "Clear Weights" resets every cell back to weight 1 (keeps walls and
   Start/End where they are). "Clear Board" wipes everything -- weights,
   walls, and puts Start/End back to their original spots.

## Why the algorithms behave differently

- **BFS** only counts the number of steps -- it has no idea that some
  cells cost more than others. It'll happily walk straight through a
  wall of "9"s if that's the shortest route step-count-wise.
- **Dijkstra** always expands whatever unvisited cell has the cheapest
  total cost so far, so it will route around expensive terrain even if
  that means more steps.
- **A*** does the same thing as Dijkstra but adds a heuristic (an
  educated guess at how far is left to go) so it usually doesn't have to
  explore nearly as much of the grid to find the same optimal-cost path.
  The heuristic used here is "octile distance," which is the correct
  heuristic once diagonal movement is allowed (plain Manhattan distance
  would overestimate and could make A* miss the actual best path).

## Notes / things I learned building this

- Doing Dijkstra/A* with a real priority queue instead of re-sorting an
  array every loop makes a noticeable difference once the grid has a lot
  of cells -- sorting every iteration is O(n log n) *per step*, which
  adds up fast.
- Diagonal movement needs its own cost multiplier (`sqrt(2)`), or the
  search thinks diagonal moves are "free" extra distance compared to
  going straight, which isn't true and messes up which path actually
  gets picked as "shortest."
- Once walls fully block the End cell, the algorithm will run out of
  reachable nodes and just stop -- that's the "no path found" case, and
  it's a totally normal outcome, not a bug.
