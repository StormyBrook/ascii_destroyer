export const initializeGridFromAscii = (asciiArtString, initialColor) => {
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
      const char = lines[i] && lines[i][j] ? lines[i][j] : ' ';
      grid[i][j] = char === ' ' ? null : { char: char, color: initialColor, original: true };
    }
  }
  return grid;
};

export const getNextGeneration = (grid, newbornChar, getRandomColorFunc, initialColor) => {
  if (!grid || grid.length === 0) {
    return [];
  }
  const height = grid.length;
  const width = grid[0].length;
  const newGrid = Array(height).fill(null).map(() => Array(width).fill(null));

  const countLiveNeighbors = (r, c) => {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        const nr = r + i;
        const nc = c + j;
        if (nr >= 0 && nr < height && nc >= 0 && nc < width && grid[nr][nc] !== null) {
          count++;
        }
      }
    }
    return count;
  };

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const liveNeighbors = countLiveNeighbors(r, c);
      const currentCell = grid[r][c];

      if (currentCell !== null) { // Live cell
        if (liveNeighbors < 2 || liveNeighbors > 3) {
          newGrid[r][c] = null; // Dies
        } else { // Lives
          if (currentCell.char !== newbornChar) { // Original character from font (not '#')
            newGrid[r][c] = { char: currentCell.char, color: initialColor, original: currentCell.original }; // Keep char, set color to initialColor
          } else { // It's a '#' character
            newGrid[r][c] = { char: newbornChar, color: getRandomColorFunc(), original: false }; // Keep '#', set random color
          }
        }
      } else { // Dead cell
        if (liveNeighbors === 3) { // Reproduction
          newGrid[r][c] = { char: newbornChar, color: getRandomColorFunc(), original: false }; // Born as '#', random color
        } else {
          newGrid[r][c] = null; // Stays dead
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
      const cell1 = grid1[i][j];
      const cell2 = grid2[i][j];
      if (cell1 === null && cell2 === null) continue;
      if (cell1 === null || cell2 === null) return false; // One is null, the other isn't
      if (cell1.char !== cell2.char || cell1.color !== cell2.color) {
        return false;
      }
    }
  }
  return true;
};

export const isPatternStable = (grid1, grid2) => {
  if (!grid1 || !grid2 || grid1.length !== grid2.length) {
    return false; // Grids are not comparable if dimensions differ or one is null
  }

  for (let i = 0; i < grid1.length; i++) {
    if (!grid1[i] || !grid2[i] || grid1[i].length !== grid2[i].length) {
      return false; // Row dimensions differ or a row is null
    }
    for (let j = 0; j < grid1[i].length; j++) {
      const cell1Char = grid1[i][j] ? grid1[i][j].char : null;
      const cell2Char = grid2[i][j] ? grid2[i][j].char : null;

      if (cell1Char !== cell2Char) {
        return false; // Characters differ, so pattern is not stable
      }
    }
  }
  return true; // All characters in all positions are the same
};

export const isEmpty = (grid) => {
  if (!grid) return true;
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      if (grid[i][j] !== null) {
        return false;
      }
    }
  }
  return true;
};
