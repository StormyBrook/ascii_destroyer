export const initializeGridFromAscii = (asciiArtString, initialColor) => {
  if (!asciiArtString) {
    return [];
  }
  const VERTICAL_PADDING = 2;
  const HORIZONTAL_PADDING = 2;
  const lines = asciiArtString.split('\n');

  // Determine actual height of the figlet art (ignoring trailing empty lines from split if any)
  let figletArtHeight = lines.length;
  while (figletArtHeight > 0 && lines[figletArtHeight - 1].trim() === '') {
    figletArtHeight--;
  }
  // If all lines were empty or only whitespace
  if (figletArtHeight === 0 && lines.every(line => line.trim() === '')) {
      figletArtHeight = 0; // Treat as no content
  }

  const figletArtMaxWidth = figletArtHeight > 0 ? lines.slice(0, figletArtHeight).reduce((max, line) => Math.max(max, line.length), 0) : 0;

  // If input was effectively empty (e.g. just spaces, or empty string)
  if (figletArtMaxWidth === 0 && figletArtHeight === 0) {
      const paddedEmptyHeight = 2 * VERTICAL_PADDING;
      // Use a small default content width if art is empty, plus padding
      const paddedEmptyWidth = (2 * HORIZONTAL_PADDING) + 10;
      return Array(paddedEmptyHeight).fill(null).map(() => Array(paddedEmptyWidth).fill(null));
  }

  const height = figletArtHeight + (2 * VERTICAL_PADDING);
  const width = figletArtMaxWidth + (2 * HORIZONTAL_PADDING);
  const grid = Array(height).fill(null).map(() => Array(width).fill(null));

  for (let r = 0; r < height; r++) {
    if (r >= VERTICAL_PADDING && r < VERTICAL_PADDING + figletArtHeight) {
      // This is a content row for Figlet art
      const artLineIndex = r - VERTICAL_PADDING;
      const lineContent = lines[artLineIndex] || "";

      for (let c = 0; c < width; c++) {
        if (c >= HORIZONTAL_PADDING && c < HORIZONTAL_PADDING + figletArtMaxWidth) {
          // This is a content column for Figlet art
          const artColIndex = c - HORIZONTAL_PADDING;
          const char = lineContent[artColIndex] ? lineContent[artColIndex] : ' ';
          if (char !== ' ') {
            grid[r][c] = { char: char, color: initialColor, original: true };
          }
          // else, it remains null (already initialized)
        }
        // else, it's a horizontal padding column, remains null (already initialized)
      }
    }
    // else, it's a vertical padding row, remains null (already initialized)
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

        const wrappedNr = (nr + height) % height;
        const wrappedNc = (nc + width) % width;

        if (grid[wrappedNr][wrappedNc] !== null) {
          count++;
        }
      }
    }
    return count;
  };

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const liveNeighbors = countLiveNeighbors(r, c);
      const currentCell = grid[r][c]; // KEEP THIS ONE

      // const currentCell = grid[r][c]; // REMOVE THIS ONE

      if (currentCell !== null) { // Live cell
        if (liveNeighbors < 2 || liveNeighbors > 3) {
          newGrid[r][c] = null; // Dies
        } else { // Lives
          // 'colorful' mode logic (defaulted)
          if (currentCell.char !== newbornChar) {
            newGrid[r][c] = { char: currentCell.char, color: initialColor, original: currentCell.original };
          } else {
            newGrid[r][c] = { char: newbornChar, color: getRandomColorFunc(), original: false };
          }
        }
      } else { // Dead cell
        if (liveNeighbors === 3) { // Reproduction
          // 'colorful' mode logic (defaulted)
          newGrid[r][c] = { char: newbornChar, color: getRandomColorFunc(), original: false };
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
