
// PathFinding Visualizer - script3.js

const ROWS = 20;
const COLS = 30;
const START_POS = { row: 10, col: 5 };
const END_POS = { row: 10, col: 24 };
const DEFAULT_WEIGHT = 1;
const MIN_WEIGHT = 1;
const MAX_WEIGHT = 99;

// sqrt(2) since moving diagonally covers more actual distance
//  than moving up/down/left/right, so it should cost more
const DIAGONAL_MULTIPLIER = Math.SQRT2; // ~1.4142

// gives statistics after completing the path
// Declared up-front (before buildGrid() runs below) since buildGrid()
// calls hideStats() as part of its own setup.
const statsEl = document.getElementById("stats");
const ALGO_NAMES = {
  bfs: "Breadth-First Search (BFS)",
  dijkstra: "Dijkstra's Algorithm",
  astar: "A* Search",
};

function hideStats() {
  statsEl.classList.remove("visible", "no-path");
  statsEl.innerHTML = "";
}

function showStats({ algo, timeMs, visitedCount, found, pathLength, cost }) {
  statsEl.classList.add("visible");

  if (!found) {
    //possible only when all the possible paths are covered with the walls which can not be crossed, 
    // hence not possible to reach at the end, walls completely blocks the movement worse than a cell which is highly expensive
    statsEl.classList.add("no-path");
    statsEl.innerHTML = `No path exists from Start to End (due to path blocked off by walls)! ${ALGO_NAMES[algo]} explored ${visitedCount} node${visitedCount === 1 ? "" : "s"} in ${timeMs.toFixed(2)} ms before giving up.`;
    return;
  }

  statsEl.classList.remove("no-path");
  statsEl.innerHTML = `
    <span class="stat-item"><strong>Algorithm:</strong> ${ALGO_NAMES[algo]}</span>
    <span class="stat-item"><strong>Time Taken:</strong> ${timeMs.toFixed(2)} ms</span>
    <span class="stat-item"><strong>Nodes Visited:</strong> ${visitedCount}</span>
    <span class="stat-item"><strong>Shortest Path Length:</strong> ${pathLength} step${pathLength === 1 ? "" : "s"}</span>
    <span class="stat-item"><strong>Total Path Cost:</strong> ${cost.toFixed(2)}</span>
  `;
}

// `grid`: a 2D array of node objects.
// Ordinary cells are rendered as <input type="number"> elements so their
// weight is always visible and directly editable by clicking + typing.
// Start/End cells are plain <div>s (marked "S"/"E") since they aren't
// weight-editable and can be dragged around the board. Walls are ALSO
// plain <div>s (no typing into a wall, that wouldn't make sense).
const gridEl = document.getElementById("grid");
let grid = [];
let startNode = null; // mutable reference -- points at whichever node is currently "start"
let endNode = null;   // same idea for "end"

function makeWeightInputEl(row, col, weight) {
  const el = document.createElement("input");
  el.type = "number";
  el.classList.add("cell");
  el.min = String(MIN_WEIGHT);
  el.max = String(MAX_WEIGHT);
  el.value = String(weight);
  el.dataset.row = row;
  el.dataset.col = col;
  return el;
}

function makeMarkerEl(row, col, kind) {
  const el = document.createElement("div");
  el.classList.add("cell", kind);
  el.textContent = kind === "start" ? "S" : "E";
  el.dataset.row = row;
  el.dataset.col = col;
  return el;
}

function makeWallEl(row, col) {
  const el = document.createElement("div");
  el.classList.add("cell", "wall");
  el.dataset.row = row;
  el.dataset.col = col;
  return el;
}

function buildGrid() {
  gridEl.innerHTML = "";
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const isStart = r === START_POS.row && c === START_POS.col;
      const isEnd = r === END_POS.row && c === END_POS.col;

      const el = isStart
        ? makeMarkerEl(r, c, "start")
        : isEnd
        ? makeMarkerEl(r, c, "end")
        : makeWeightInputEl(r, c, DEFAULT_WEIGHT);

      gridEl.appendChild(el);

      const node = {
        row: r,
        col: c,
        weight: DEFAULT_WEIGHT,
        isStart,
        isEnd,
        isWall: false,
        el,
      };

      if (isStart) startNode = node;
      if (isEnd) endNode = node;

      row.push(node);
    }
    grid.push(row);
  }
  hideStats();
}

buildGrid();

// adding weights to the cells (other than the default one), click + type, no dragging
// Typing into a cell updates its weight live and recolors it
gridEl.addEventListener("input", (e) => {
  const node = getNodeFromTarget(e.target);
  if (!node || node.isStart || node.isEnd || node.isWall) return;

  const raw = Number(e.target.value);
  const weight = Number.isNaN(raw) ? DEFAULT_WEIGHT : clampWeight(raw);
  node.weight = weight;
  updateCellColor(node);
});

gridEl.addEventListener("change", (e) => {
  const node = getNodeFromTarget(e.target);
  if (!node || node.isStart || node.isEnd || node.isWall) return;

  e.target.value = String(node.weight);
});

function clampWeight(w) {
  return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Math.round(w)));
}

// Recolors a cell based on its current weight. Weight 1 (the default)
// looks like a plain empty cell; every step above that shifts toward a
// bolder gold-to-red so heavier cells are unmistakably heavier.
function updateCellColor(node) {
  if (node.isStart || node.isEnd || node.isWall) return;
  if (node.weight <= DEFAULT_WEIGHT) {
    node.el.style.backgroundColor = "";
    node.el.classList.remove("weighted");
  } else {
    node.el.style.backgroundColor = weightToColor(node.weight);
    node.el.classList.add("weighted");
  }
}

function weightToColor(weight) {
  const t = (weight - 1) / (MAX_WEIGHT - 1); // 0..1
  const startColor = [214, 137, 16];  // amber, just above default
  const endColor = [178, 34, 34];     // firebrick red, at max weight
  const rgb = startColor.map((s, i) => Math.round(s + (endColor[i] - s) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

// When Wall Mode is ON, clicking/dragging
// over cells paints or erases walls instead of focusing the input.
let wallMode = false;
const wallModeBtn = document.getElementById("wallModeBtn");

wallModeBtn.addEventListener("click", () => {
  wallMode = !wallMode;
  wallModeBtn.textContent = wallMode ? "Wall Mode: ON" : "Wall Mode: OFF";
  wallModeBtn.classList.toggle("active", wallMode);
});

// we can drag start, end and walls
let mouseIsDown = false;
let draggingStart = false;
let draggingEnd = false;
let draggingWalls = false;
// when painting walls by dragging, we lock in whether we're ADDING walls
// or REMOVING them based on the very first cell you clicked, so you don't
// flip-flop back and forth as the mouse crosses cells that are already walls
let wallPaintValue = true;

gridEl.addEventListener("mousedown", (e) => {
  const node = getNodeFromTarget(e.target);
  if (!node) return;

  mouseIsDown = true;

  if (node.isStart) {
    draggingStart = true;
    return;
  }
  if (node.isEnd) {
    draggingEnd = true;
    return;
  }

  if (wallMode) {
    // this cell is a normal weight cell or a wall -- either way, flip it,
    // and remember which direction we flipped it so dragging is smooth
    e.preventDefault(); // stop the number input from grabbing focus/cursor
    wallPaintValue = !node.isWall;
    setWall(node, wallPaintValue);
    draggingWalls = true;
  }
  // if wallMode is off and this is a plain weight cell: do nothing special,
  // let the click just focus the input like normal so typing works
});

gridEl.addEventListener("mouseover", (e) => {
  if (!mouseIsDown) return;
  const node = getNodeFromTarget(e.target);
  if (!node) return;

  if (draggingStart) {
    moveStart(node);
  } else if (draggingEnd) {
    moveEnd(node);
  } else if (draggingWalls) {
    setWall(node, wallPaintValue);
  }
});

document.addEventListener("mouseup", () => {
  mouseIsDown = false;
  draggingStart = false;
  draggingEnd = false;
  draggingWalls = false;
});

function getNodeFromTarget(target) {
  if (!target || !target.classList || !target.classList.contains("cell")) return null;
  const r = Number(target.dataset.row);
  const c = Number(target.dataset.col);
  if (Number.isNaN(r) || Number.isNaN(c)) return null;
  return grid[r][c];
}

// Swaps a node's element in place (same DOM position, so the CSS grid
// layout doesn't shift) between a weight-input, a wall block, and a
// start/end marker.
function replaceNodeEl(node, newEl) {
  node.el.replaceWith(newEl);
  node.el = newEl;
}

// Turns a cell into a wall (makeWall=true) or back into a normal editable
// weight cell (makeWall=false). Can't wall over the Start or End cell,
// that would be pretty pointless (and break the whole search).
function setWall(node, makeWall) {
  if (node.isStart || node.isEnd) return;
  if (node.isWall === makeWall) return; // already in that state, nothing to do

  if (makeWall) {
    node.isWall = true;
    replaceNodeEl(node, makeWallEl(node.row, node.col));
  } else {
    node.isWall = false;
    // give it back its old weight instead of resetting to 1, seems nicer
    replaceNodeEl(node, makeWeightInputEl(node.row, node.col, node.weight));
    updateCellColor(node);
  }
}

// Moves the "start" label from the old start node to a new one. The old
// start cell turns back into a normal editable weight cell; the new cell
// becomes the start marker. Can't drop Start onto a wall or onto End.
function moveStart(newNode) {
  if (newNode === endNode || newNode === startNode || newNode.isWall) return;

  const oldStart = startNode;
  oldStart.isStart = false;
  replaceNodeEl(oldStart, makeWeightInputEl(oldStart.row, oldStart.col, oldStart.weight));

  newNode.isStart = true;
  const savedWeight = newNode.weight;
  replaceNodeEl(newNode, makeMarkerEl(newNode.row, newNode.col, "start"));
  newNode.weight = savedWeight; // weight is remembered even while hidden under the marker

  startNode = newNode;
}

// Same idea, for the "end" node.
function moveEnd(newNode) {
  if (newNode === startNode || newNode === endNode || newNode.isWall) return;

  const oldEnd = endNode;
  oldEnd.isEnd = false;
  replaceNodeEl(oldEnd, makeWeightInputEl(oldEnd.row, oldEnd.col, oldEnd.weight));

  newNode.isEnd = true;
  const savedWeight = newNode.weight;
  replaceNodeEl(newNode, makeMarkerEl(newNode.row, newNode.col, "end"));
  newNode.weight = savedWeight;

  endNode = newNode;
}

// Returns every walkable neighbor of a node, straight AND diagonal, each
// tagged with whether getting there was a diagonal move (so the search
// functions know whether to charge the extra sqrt(2) cost for it).
// Walls are just skipped entirely -- they never show up as a neighbor of
// anything
function getNeighbors(node) {
  const { row, col } = node;
  const neighbors = [];

  // 4 straight directions
  const straightDirs = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
  ];
  // 4 diagonal directions
  const diagonalDirs = [
    [-1, -1], [-1, 1], [1, -1], [1, 1],
  ];

  for (const [dr, dc] of straightDirs) {
    const r = row + dr, c = col + dc;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    const n = grid[r][c];
    if (n.isWall) continue;
    neighbors.push({ node: n, diagonal: false });
  }

  for (const [dr, dc] of diagonalDirs) {
    const r = row + dr, c = col + dc;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    const n = grid[r][c];
    if (n.isWall) continue;

    // corner-cutting check: not allowing squeezing diagonally between two
    // walls that are touching corner-to-corner, that looks/feels wrong
    // (like walking through a closed gate diagonally). if BOTH of the
    // orthogonal cells next to this diagonal move are walls, skip it.
    const rowNeighborIsWall = grid[row + dr][col].isWall;
    const colNeighborIsWall = grid[row][col + dc].isWall;
    if (rowNeighborIsWall && colNeighborIsWall) continue;

    neighbors.push({ node: n, diagonal: true });
  }

  return neighbors;
}

//MIN-HEAP (priority queue)
// This is a classic array-backed binary heap, smallest
// priority sits at index 0. I went with "lazy deletion" instead of a
// proper decrease-key: when a node's priority improves we just push it
// again with the new priority, and when we pop we skip anything that's
// already been finalized.
class MinHeap {
  constructor() {
    this.items = []; // each item: { node, priority }
  }

  get size() {
    return this.items.length;
  }

  push(node, priority) {
    this.items.push({ node, priority });
    this._bubbleUp(this.items.length - 1);
  }

  // removes and returns the node with the smallest priority
  pop() {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this._bubbleDown(0);
    }
    return top.node;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].priority <= this.items[i].priority) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  _bubbleDown(i) {
    const n = this.items.length;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;
      if (left < n && this.items[left].priority < this.items[smallest].priority) smallest = left;
      if (right < n && this.items[right].priority < this.items[smallest].priority) smallest = right;
      if (smallest === i) break;
      [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
      i = smallest;
    }
  }
}

// Classic BFS: queue + visited set. BFS treats every move (straight OR
// diagonal) as cost 1 regardless of the cell's weight, so it finds the
// path with the FEWEST STEPS, not necessarily the cheapest one. This is
// exactly why it can disagree with Dijkstra/A* once weighted cells (or
// walls) are on the board.
function bfs(startNode, endNode) {
  const visitedInOrder = [];   // for animation
  const visited = new Set([startNode]);
  const prev = new Map();      // to rebuild the path afterwards
  const queue = [startNode];
  let reachedEnd = false;

  while (queue.length > 0) {
    const current = queue.shift(); // dequeue (front of the line)
    visitedInOrder.push(current);

    if (current === endNode) { reachedEnd = true; break; }

    for (const { node: neighbor } of getNeighbors(current)) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        prev.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  return { visitedInOrder, prev, reachedEnd };
}

// DIJKSTRA ,Always expand the *cheapest* unvisited node first (by accumulated cost
// from start), where moving into a cell costs that cell's weight (times
// the diagonal multiplier if it was a diagonal move). With all weights
// equal to 1 and no diagonals this behaves like BFS -- but now that
// diagonals exist, Dijkstra can also find shorter-distance paths that BFS
// wouldn't even consider "shortest" since BFS just counts steps.
// Uses the MinHeap above
function dijkstra(startNode, endNode) {
  const visitedInOrder = [];
  const prev = new Map();
  const dist = new Map();
  const finalized = new Set(); // nodes we've locked in the true shortest distance for
  let reachedEnd = false;

  dist.set(startNode, 0);
  const pq = new MinHeap();
  pq.push(startNode, 0);

  while (pq.size > 0) {
    const current = pq.pop();

    // lazy deletion: this node might already be in the heap more than
    // once (pushed again earlier when we found a cheaper route to it).
    // if it's already finalized, this pop is a stale duplicate, skip it.
    if (finalized.has(current)) continue;
    finalized.add(current);
    visitedInOrder.push(current);

    if (current === endNode) { reachedEnd = true; break; }

    for (const { node: neighbor, diagonal } of getNeighbors(current)) {
      if (finalized.has(neighbor)) continue;

      const stepCost = diagonal ? neighbor.weight * DIAGONAL_MULTIPLIER : neighbor.weight;
      const newDist = dist.get(current) + stepCost;
      const oldDist = dist.has(neighbor) ? dist.get(neighbor) : Infinity;

      if (newDist < oldDist) {
        dist.set(neighbor, newDist);
        prev.set(neighbor, current);
        pq.push(neighbor, newDist);
      }
    }
  }

  return { visitedInOrder, prev, reachedEnd };
}

// A* algorithm, Same bookkeeping as Dijkstra, but nodes are prioritized by f = g + h,
// where g is the real cost-so-far (like Dijkstra) and h is a heuristic
// *estimate* of the remaining cost to the end. Since diagonal movement is
// allowed now, plain Manhattan distance would actually OVERestimate the
// true cost (it assumes you can only go straight), which can break A*'s
// "never overestimate" guarantee. So instead this uses octile distance,
// which is the proper heuristic once diagonal moves are in play.
function astar(startNode, endNode) {
  const visitedInOrder = [];
  const prev = new Map();
  const gScore = new Map();
  const finalized = new Set();
  let reachedEnd = false;

  // octile distance: straight-line cost if you take the diagonal shortcut
  // as far as possible, then walk the remainder in a straight line
  function heuristic(a, b) {
    const dx = Math.abs(a.col - b.col);
    const dy = Math.abs(a.row - b.row);
    const straight = Math.abs(dx - dy);
    const diagonal = Math.min(dx, dy);
    return straight + diagonal * DIAGONAL_MULTIPLIER;
  }

  gScore.set(startNode, 0);
  const pq = new MinHeap();
  pq.push(startNode, heuristic(startNode, endNode));

  while (pq.size > 0) {
    const current = pq.pop();

    if (finalized.has(current)) continue; // stale duplicate, see Dijkstra's comment above
    finalized.add(current);
    visitedInOrder.push(current);

    if (current === endNode) { reachedEnd = true; break; }

    for (const { node: neighbor, diagonal } of getNeighbors(current)) {
      if (finalized.has(neighbor)) continue;

      const stepCost = diagonal ? neighbor.weight * DIAGONAL_MULTIPLIER : neighbor.weight;
      const tentativeG = gScore.get(current) + stepCost;
      const oldG = gScore.has(neighbor) ? gScore.get(neighbor) : Infinity;

      if (tentativeG < oldG) {
        gScore.set(neighbor, tentativeG);
        prev.set(neighbor, current);
        pq.push(neighbor, tentativeG + heuristic(neighbor, endNode));
      }
    }
  }

  return { visitedInOrder, prev, reachedEnd };
}

// PATH RECONSTRUCTION, Walk backwards from the end node using the `prev` map until we hit
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

// Sum of the cost of every step actually taken along the path (diagonal
// steps cost a bit more, same rule the search functions used). The start
// cell itself is free since you're already standing there.
function pathCost(path) {
  let total = 0;
  let prevNode = startNode;
  for (const node of path) {
    const isDiagonal = node.row !== prevNode.row && node.col !== prevNode.col;
    total += isDiagonal ? node.weight * DIAGONAL_MULTIPLIER : node.weight;
    prevNode = node;
  }
  return total;
}

//animation, Every setTimeout id gets stashed here so a fresh run can cancel
// anything left over from a previous one.
let scheduledTimeouts = [];

function cancelScheduledAnimation() {
  scheduledTimeouts.forEach((id) => clearTimeout(id));
  scheduledTimeouts = [];
}

// runs the "explored" animation then the "path" animation, and calls
// onDone() once everything has actually finished playing on screen.
// (moved the stats display into onDone so you don't get spoiled with the
// answer before you've even watched the algorithm work through the grid)
function animate(visitedInOrder, path, onDone) {
  visitedInOrder.forEach((node, i) => {
    const id = setTimeout(() => {
      if (!node.isStart && !node.isEnd) {
        node.el.classList.add("visited");
      }
    }, 15 * i);
    scheduledTimeouts.push(id);
  });

  const pathStartDelay = 15 * visitedInOrder.length;
  path.forEach((node, i) => {
    const id = setTimeout(() => {
      if (!node.isStart && !node.isEnd) {
        node.el.classList.add("path");
      }
    }, pathStartDelay + 30 * i);
    scheduledTimeouts.push(id);
  });

  const totalDelay = pathStartDelay + 30 * path.length;
  const doneId = setTimeout(onDone, totalDelay);
  scheduledTimeouts.push(doneId);
}

document.getElementById("startBtn").addEventListener("click", () => {
  const algo = document.getElementById("algo").value;

  cancelScheduledAnimation(); // stop any in-flight animation from a previous run
  clearVisualOnly(); // clear previous visited/path colors, keep weights + walls
  hideStats();

  const runner = algo === "bfs" ? bfs : algo === "dijkstra" ? dijkstra : astar;

  // the actual search runs instantly (milliseconds)
  // animation afterwards is just for show and takes way longer, but the
  // real algorithm + timing numbers are already locked in right here
  const t0 = performance.now();
  const result = runner(startNode, endNode);
  const t1 = performance.now();

  const path = result.reachedEnd ? reconstructPath(result.prev, endNode) : [];
  const cost = pathCost(path);

  // stats are now held back until the animation has fully played out, so
  // watching the search happen isn't spoiled by the answer up top
  animate(result.visitedInOrder, path, () => {
    showStats({
      algo,
      timeMs: t1 - t0,
      visitedCount: result.visitedInOrder.length,
      found: result.reachedEnd,
      pathLength: path.length,
      cost,
    });
  });
});

document.getElementById("clearWeightsBtn").addEventListener("click", () => {
  cancelScheduledAnimation();
  for (const row of grid) {
    for (const node of row) {
      if (node.isStart || node.isEnd || node.isWall) continue;
      node.weight = DEFAULT_WEIGHT;
      node.el.value = String(DEFAULT_WEIGHT);
      updateCellColor(node);
    }
  }
});

document.getElementById("clearBoardBtn").addEventListener("click", () => {
  cancelScheduledAnimation();
  buildGrid(); // rebuilds everything from scratch, so walls get wiped too
});

function clearVisualOnly() {
  for (const row of grid) {
    for (const node of row) {
      node.el.classList.remove("visited", "path");
    }
  }
}
