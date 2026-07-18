// ===================== CONFIG =====================
const ROWS = 20;
const COLS = 30;
const START_POS = { row: 10, col: 5 };
const END_POS = { row: 10, col: 24 };

// ===================== BUILD THE GRID =====================
// `grid` is our real data structure: a 2D array of node objects.
// Each node also stores a reference to its <div> so we can update colors.
const gridEl = document.getElementById("grid");
let grid = [];
let startNode = null; // mutable reference -- points at whichever node is currently "start"
let endNode = null;   // same idea for "end"

function buildGrid() {
  gridEl.innerHTML = "";
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const cellEl = document.createElement("div");
      cellEl.classList.add("cell");
      cellEl.dataset.row = r;
      cellEl.dataset.col = c;
      gridEl.appendChild(cellEl);

      const node = {
        row: r,
        col: c,
        isWall: false,
        isStart: r === START_POS.row && c === START_POS.col,
        isEnd: r === END_POS.row && c === END_POS.col,
        el: cellEl,
      };

      if (node.isStart) { cellEl.classList.add("start"); startNode = node; }
      if (node.isEnd) { cellEl.classList.add("end"); endNode = node; }

      row.push(node);
    }
    grid.push(row);
  }
}

buildGrid();

// ===================== WALL DRAWING + DRAGGING START/END =====================
// Three possible drag modes at any time: drawing walls, dragging the start
// node, or dragging the end node. Which one we're in is decided the moment
// mousedown fires, based on what cell was clicked.
let mouseIsDown = false;
let draggingStart = false;
let draggingEnd = false;

gridEl.addEventListener("mousedown", (e) => {
  const node = getNodeFromTarget(e.target);
  if (!node) return;

  mouseIsDown = true;

  if (node.isStart) {
    draggingStart = true;
  } else if (node.isEnd) {
    draggingEnd = true;
  } else {
    toggleWall(e.target);
  }
});

gridEl.addEventListener("mouseover", (e) => {
  if (!mouseIsDown) return;
  const node = getNodeFromTarget(e.target);
  if (!node) return;

  if (draggingStart) {
    moveStart(node);
  } else if (draggingEnd) {
    moveEnd(node);
  } else {
    toggleWall(e.target);
  }
});

document.addEventListener("mouseup", () => {
  mouseIsDown = false;
  draggingStart = false;
  draggingEnd = false;
});

function getNodeFromTarget(target) {
  if (!target.classList.contains("cell")) return null;
  const r = Number(target.dataset.row);
  const c = Number(target.dataset.col);
  return grid[r][c];
}

function toggleWall(target) {
  const node = getNodeFromTarget(target);
  if (!node || node.isStart || node.isEnd) return; // never wall the start/end
  node.isWall = true;
  target.classList.add("wall");
}

// Moves the "start" label from the old start node to a new one.
function moveStart(newNode) {
  if (newNode === endNode || newNode.isWall) return; // can't overlap end or a wall
  startNode.isStart = false;
  startNode.el.classList.remove("start");
  newNode.isStart = true;
  newNode.el.classList.add("start");
  startNode = newNode;
}

// Same idea, for the "end" node.
function moveEnd(newNode) {
  if (newNode === startNode || newNode.isWall) return;
  endNode.isEnd = false;
  endNode.el.classList.remove("end");
  newNode.isEnd = true;
  newNode.el.classList.add("end");
  endNode = newNode;
}

// ===================== NEIGHBOR HELPER =====================
// Returns the up/down/left/right neighbors of a node that exist on the grid.
function getNeighbors(node) {
  const { row, col } = node;
  const neighbors = [];
  if (row > 0) neighbors.push(grid[row - 1][col]);
  if (row < ROWS - 1) neighbors.push(grid[row + 1][col]);
  if (col > 0) neighbors.push(grid[row][col - 1]);
  if (col < COLS - 1) neighbors.push(grid[row][col + 1]);
  // skip walls entirely, they are not valid neighbors
  return neighbors.filter((n) => !n.isWall);
}

// ===================== BFS =====================
// Classic BFS: queue + visited set. Because every edge on this grid has the
// same "cost" (moving to an adjacent cell), BFS already finds the shortest
// path in terms of number of steps.
function bfs(startNode, endNode) {
  const visitedInOrder = [];   // for animation
  const visited = new Set([startNode]);
  const prev = new Map();      // to rebuild the path afterwards
  const queue = [startNode];

  while (queue.length > 0) {
    const current = queue.shift(); // dequeue (front of the line)
    visitedInOrder.push(current);

    if (current === endNode) break;

    for (const neighbor of getNeighbors(current)) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        prev.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  return { visitedInOrder, prev };
}

// ===================== DIJKSTRA =====================
// Same idea as BFS, but instead of a plain queue we always expand the
// *closest* unvisited node first (by distance from start). On this grid,
// where every step costs 1, this behaves identically to BFS -- that's a
// good thing to point out in an interview: BFS is Dijkstra's algorithm
// with a plain queue instead of a priority queue, because all weights = 1.
function dijkstra(startNode, endNode) {
  const visitedInOrder = [];
  const prev = new Map();
  const dist = new Map();
  const visited = new Set();

  // initialize all distances to Infinity except the start node
  for (const row of grid) {
    for (const node of row) {
      dist.set(node, Infinity);
    }
  }
  dist.set(startNode, 0);

  // unvisitedQueue holds every non-wall node; we linearly scan for the
  // minimum each time (fine for a grid this size, and easy to explain --
  // a real production version would use a min-heap for O(log n) extraction)
  const unvisited = [];
  for (const row of grid) {
    for (const node of row) {
      if (!node.isWall) unvisited.push(node);
    }
  }

  while (unvisited.length > 0) {
    // find node with smallest distance
    unvisited.sort((a, b) => dist.get(a) - dist.get(b));
    const current = unvisited.shift();

    if (dist.get(current) === Infinity) break; // unreachable nodes left
    visited.add(current);
    visitedInOrder.push(current);

    if (current === endNode) break;

    for (const neighbor of getNeighbors(current)) {
      if (visited.has(neighbor)) continue;
      const newDist = dist.get(current) + 1; // every edge costs 1
      if (newDist < dist.get(neighbor)) {
        dist.set(neighbor, newDist);
        prev.set(neighbor, current);
      }
    }
  }

  return { visitedInOrder, prev };
}

// ===================== PATH RECONSTRUCTION =====================
// Walk backwards from the end node using the `prev` map until we hit
// the start node, then reverse it to get start -> end order.
function reconstructPath(prev, endNode) {
  const path = [];
  let current = endNode;
  while (prev.has(current)) {
    path.push(current);
    current = prev.get(current);
  }
  return path.reverse();
}

// ===================== ANIMATION =====================
function animate(visitedInOrder, path) {
  visitedInOrder.forEach((node, i) => {
    setTimeout(() => {
      if (!node.isStart && !node.isEnd) {
        node.el.classList.add("visited");
      }
    }, 15 * i);
  });

  setTimeout(() => {
    path.forEach((node, i) => {
      setTimeout(() => {
        if (!node.isStart && !node.isEnd) {
          node.el.classList.add("path");
        }
      }, 30 * i);
    });
  }, 15 * visitedInOrder.length);
}

// ===================== BUTTON WIRING =====================
document.getElementById("startBtn").addEventListener("click", () => {
  const algo = document.getElementById("algo").value;
  // startNode / endNode are module-level variables that get updated
  // whenever the user drags the green/red node to a new cell.

  clearVisualOnly(); // clear previous visited/path colors, keep walls

  const result = algo === "bfs" ? bfs(startNode, endNode) : dijkstra(startNode, endNode);
  const path = reconstructPath(result.prev, endNode);

  animate(result.visitedInOrder, path);
});

document.getElementById("clearWallsBtn").addEventListener("click", () => {
  for (const row of grid) {
    for (const node of row) {
      node.isWall = false;
      node.el.classList.remove("wall");
    }
  }
});

document.getElementById("clearBoardBtn").addEventListener("click", buildGrid);

function clearVisualOnly() {
  for (const row of grid) {
    for (const node of row) {
      node.el.classList.remove("visited", "path");
    }
  }
}