import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMap,
  getMapName,
  MAP_COLS,
  MAP_ROWS,
} from "../app/map-layouts.ts";

const spawnCells = [
  [1, 1],
  [13, 9],
  [1, 9],
  [13, 1],
  [7, 9],
];

function reachableCells(board) {
  const queue = [[1, 1]];
  const visited = new Set(["1,1"]);

  while (queue.length) {
    const [col, row] = queue.shift();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nextCol = col + dx;
      const nextRow = row + dy;
      const key = `${nextCol},${nextRow}`;
      if (visited.has(key) || board[nextRow]?.[nextCol] === 1) continue;
      visited.add(key);
      queue.push([nextCol, nextRow]);
    }
  }
  return visited;
}

test("ships six distinct named map layouts", () => {
  const names = Array.from({ length: 6 }, (_, index) => getMapName(index + 1));
  const wallSignatures = Array.from({ length: 6 }, (_, index) =>
    buildMap(index + 1)
      .flatMap((row, rowIndex) =>
        row.map((tile, colIndex) => (tile === 1 ? `${colIndex},${rowIndex}` : "")),
      )
      .filter(Boolean)
      .join("|"),
  );

  assert.equal(new Set(names).size, 6);
  assert.equal(new Set(wallSignatures).size, 6);
  assert.equal(getMapName(7), names[0]);
});

test("every map keeps borders, spawns, and structural routes valid", () => {
  for (let level = 1; level <= 12; level += 1) {
    const board = buildMap(level);
    assert.equal(board.length, MAP_ROWS);
    assert.ok(board.every((row) => row.length === MAP_COLS));

    for (let col = 0; col < MAP_COLS; col += 1) {
      assert.equal(board[0][col], 1);
      assert.equal(board[MAP_ROWS - 1][col], 1);
    }
    for (let row = 0; row < MAP_ROWS; row += 1) {
      assert.equal(board[row][0], 1);
      assert.equal(board[row][MAP_COLS - 1], 1);
    }

    const reachable = reachableCells(board);
    for (const [col, row] of spawnCells) {
      assert.equal(board[row][col], 0, `level ${level} spawn ${col},${row}`);
      assert.ok(
        reachable.has(`${col},${row}`),
        `level ${level} route to spawn ${col},${row}`,
      );
    }
  }
});
