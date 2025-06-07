export const initializeGridFromAscii = (asciiArtString) => {
  if (!asciiArtString) {
    return [];
  }
  const lines = asciiArtString.split('\n');
  const height = lines.length;
  const width = lines.reduce((max, line) => Math.max(max, line.length), 0);

  const grid = [];
  for (let i = 0; i < height; i++) {
    grid[i] = [];
    for (let j = 0; j < width; j++) {
      grid[i][j] = lines[i] && lines[i][j] && lines[i][j] !== ' ' ? 1 : 0;
    }
  }
  return grid;
};

export const getNextGeneration = (grid) => {
  if (!grid || grid.length === 0) {
    return [];
  }
  const height = grid.length;
  const width = grid[0].length;
  const newGrid = Array(height).fill(null).map(() => Array(width).fill(0));

  const countLiveNeighbors = (r, c) => {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        const nr = r + i;
        const nc = c + j;
        if (nr >= 0 && nr < height && nc >= 0 && nc < width && grid[nr][nc] === 1) {
          count++;
        }
      }
    }
    return count;
  };

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const liveNeighbors = countLiveNeighbors(r, c);
      const cell = grid[r][c];

      if (cell === 1) { // Live cell
        if (liveNeighbors < 2 || liveNeighbors > 3) {
          newGrid[r][c] = 0; // Dies
        } else {
          newGrid[r][c] = 1; // Lives
        }
      } else { // Dead cell
        if (liveNeighbors === 3) {
          newGrid[r][c] = 1; // Becomes live
        } else {
          newGrid[r][c] = 0; // Stays dead
        }
      }
    }
  }
  return newGrid;
};

export const isStable = (grid1, grid2) => {
  if (!grid1 || !grid2 || grid1.length !== grid2.length) {
    return false;
  }
  for (let i = 0; i < grid1.length; i++) {
    if (grid1[i].length !== grid2[i].length) {
      return false;
    }
    for (let j = 0; j < grid1[i].length; j++) {
      if (grid1[i][j] !== grid2[i][j]) {
        return false;
      }
    }
  }
  return true;
};

export const isEmpty = (grid) => {
  if (!grid) return true;
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      if (grid[i][j] === 1) {
        return false;
      }
    }
  }
  return true;
};
