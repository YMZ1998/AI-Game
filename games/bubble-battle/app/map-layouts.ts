export const MAP_COLS = 15;
export const MAP_ROWS = 11;

type MapLayout = {
  name: string;
  crateDensity: number;
  isHardWall: (col: number, row: number) => boolean;
  isOpenLane: (col: number, row: number) => boolean;
};

const cellSet = (cells: Array<[number, number]>) =>
  new Set(cells.map(([col, row]) => `${col},${row}`));

const plazaWalls = cellSet([
  [5, 3],
  [6, 3],
  [8, 3],
  [9, 3],
  [5, 4],
  [9, 4],
  [5, 6],
  [9, 6],
  [5, 7],
  [6, 7],
  [8, 7],
  [9, 7],
]);

const islandWalls = cellSet([
  [4, 2],
  [4, 3],
  [10, 2],
  [10, 3],
  [2, 5],
  [3, 5],
  [11, 5],
  [12, 5],
  [4, 7],
  [4, 8],
  [10, 7],
  [10, 8],
]);

const stormWalls = cellSet([
  [3, 2],
  [5, 2],
  [6, 2],
  [8, 4],
  [9, 4],
  [11, 4],
  [3, 6],
  [5, 6],
  [6, 6],
  [8, 8],
  [9, 8],
  [11, 8],
]);

const mapLayouts: MapLayout[] = [
  {
    name: "珊瑚方阵",
    crateDensity: 0.43,
    isHardWall: (col, row) => row % 2 === 0 && col % 2 === 0,
    isOpenLane: () => false,
  },
  {
    name: "双桥水道",
    crateDensity: 0.4,
    isHardWall: (col, row) =>
      (col === 5 || col === 9) && ![2, 5, 8].includes(row),
    isOpenLane: (_col, row) => [2, 5, 8].includes(row),
  },
  {
    name: "中央喷泉",
    crateDensity: 0.46,
    isHardWall: (col, row) => plazaWalls.has(`${col},${row}`),
    isOpenLane: (col, row) => col === 7 || row === 5,
  },
  {
    name: "回旋码头",
    crateDensity: 0.39,
    isHardWall: (col, row) =>
      (col === 3 && row <= 6 && row !== 3) ||
      (col === 7 && row >= 4 && row !== 7) ||
      (col === 11 && row <= 6 && row !== 3),
    isOpenLane: (_col, row) => row === 3 || row === 7,
  },
  {
    name: "四潮群岛",
    crateDensity: 0.48,
    isHardWall: (col, row) => islandWalls.has(`${col},${row}`),
    isOpenLane: (col, row) => col === 7 || row === 5,
  },
  {
    name: "闪电运河",
    crateDensity: 0.44,
    isHardWall: (col, row) => stormWalls.has(`${col},${row}`),
    isOpenLane: (col, row) =>
      (row === 2 && col === 4) ||
      (row === 4 && col === 10) ||
      (row === 6 && col === 4) ||
      (row === 8 && col === 10),
  },
];

const spawnSafe = new Set([
  "1,1",
  "2,1",
  "1,2",
  "13,9",
  "12,9",
  "13,8",
  "1,9",
  "2,9",
  "1,8",
  "13,1",
  "12,1",
  "13,2",
  "7,9",
  "7,8",
  "6,9",
  "8,9",
]);

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function getMapName(level: number) {
  return mapLayouts[(level - 1) % mapLayouts.length].name;
}

export function buildMap(level: number) {
  const layout = mapLayouts[(level - 1) % mapLayouts.length];
  const cycle = Math.floor((level - 1) / mapLayouts.length);
  const crateDensity = Math.min(0.56, layout.crateDensity + cycle * 0.025);
  const random = seededRandom(6889 + level * 917);

  return Array.from({ length: MAP_ROWS }, (_, row) =>
    Array.from({ length: MAP_COLS }, (_, col) => {
      const key = `${col},${row}`;
      if (
        row === 0 ||
        col === 0 ||
        row === MAP_ROWS - 1 ||
        col === MAP_COLS - 1
      ) {
        return 1;
      }
      if (spawnSafe.has(key)) return 0;
      if (layout.isHardWall(col, row)) return 1;
      if (layout.isOpenLane(col, row)) return 0;
      return random() < crateDensity ? 2 : 0;
    }),
  );
}
