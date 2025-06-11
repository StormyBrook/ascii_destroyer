import Head from 'next/head'
import { useState, useEffect, useRef, useCallback } from 'react'
import figlet from 'figlet'
import styles from '../styles/Home.module.css'
import { initializeGridFromAscii, getNextGeneration, isStable, isEmpty, isPatternStable } from '../lib/gameOfLife'
import AsciiDonut from '../components/AsciiDonut';

// To enable GIF export, you'll need to install a GIF encoding library.
// Example using 'gifenc': npm install gifenc
// import { GIFEncoder, quantize, applyPalette } from 'gifenc'; // Conceptual, uncomment and use after install
// You might also want 'file-saver' for robust downloads: npm install file-saver
// import { saveAs } from 'file-saver'; // Conceptual

const SIMULATION_SPEED_MS = 200; // ms per generation
const DEAD_CELL_CHAR = ' ';
const NEWBORN_CELL_CHAR = '#';

const INITIAL_NEON_PURPLE = '#c084fc'; // Orchid, as a distinct purple
const NEON_COLORS = [INITIAL_NEON_PURPLE, '#FFFF00', '#00FFFF']; // Purple, Yellow, Cyan

const MAX_INPUT_CHARS_PER_LINE = 12;

const GIF_STATIC_FRAME_COUNT = 5;
const GIF_STATIC_FRAME_DELAY_MS = 500;
const GIF_SIMULATION_FRAME_DELAY_MS = SIMULATION_SPEED_MS;
const GIF_MAX_TOTAL_FRAMES = 300;
const GIF_LOOP_DETECTION_HISTORY_SIZE = 10;
const GIF_OSCILLATOR_CYCLES_TO_CAPTURE = 2;
const GIF_CANVAS_FONT_SIZE_PX = 10;
const GIF_CANVAS_CHAR_WIDTH_PX = GIF_CANVAS_FONT_SIZE_PX * 0.6;
const GIF_CANVAS_LINE_HEIGHT_PX = GIF_CANVAS_FONT_SIZE_PX;


const aboutText = `This application brings Conway's Game of Life to your text! Start by typing a word or phrase, and watch it transform into ASCII art using the classic "Standard" Figlet font. This generated artwork then becomes the initial seed for a Game of Life simulation.

In this simulation, the original characters from your text art will remain purple. As the Game of Life evolves, any new cells ('#') that are born, or any '#' characters that were part of the original Figlet design and survive, will light up in random neon colors (purple, yellow, or blue). The simulation grid is a toroidal array, meaning it wraps around on all sides – cells moving off one edge will reappear on the opposite side.

Below the Game of Life, you'll see a spinning ASCII donut. This is a separate animation primarily to visually demonstrate the concept of a toroidal shape, similar to how the Game of Life grid behaves with its wrap-around edges. Enjoy the cellular automata and the spinning pastry!`;

export default function Home() {
  const frameMetadata = {
    version: "next",
    imageUrl: "/images/frame-image.png",
    button: {
      title: "Launch Conway's Game of Life",
      action: {
        type: "launch_frame",
        name: "Conway's Game of Life",
        splashImageUrl: "/images/logo-splash.png",
        splashBackgroundColor: "#1a202c"
      }
    }
  };
  const stringifiedFrameMetadata = JSON.stringify(frameMetadata);

  const [inputText, setInputText] = useState('')
  const [asciiArt, setAsciiArt] = useState('')
  const [gameOfLifeGrid, setGameOfLifeGrid] = useState(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const simulationIntervalId = useRef(null)
  const [stableGenerationCount, setStableGenerationCount] = useState(0);
  const [dynamicFontSize, setDynamicFontSize] = useState('7px'); // Initial default, matching new minFontSizePx
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [gifProgress, setGifProgress] = useState('');

  const minFontSizePx = 7; // Changed from 16 to 7
  const maxFontSizePx = 40; // Kept at 40


  const getRandomNeonColor = () => {
    return NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
  };

  const handleInputChange = (event) => {
    setInputText(event.target.value)
  }

  const getFigletArtPromise = (text, fontOptions) => {
    return new Promise((resolve, reject) => {
      figlet.text(text, fontOptions, (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  };

  const generateAsciiArt = async () => {
    if (isSimulating) {
      if (simulationIntervalId.current) {
        clearInterval(simulationIntervalId.current);
        simulationIntervalId.current = null;
      }
      setIsSimulating(false);
    }
    setStableGenerationCount(0);

    const trimmedInput = inputText.trim();

    if (!trimmedInput) {
      setAsciiArt('');
      setGameOfLifeGrid(null);
      setDynamicFontSize(`${minFontSizePx}px`);
      return;
    }

    const words = trimmedInput.split(/\s+/).filter(Boolean);
    let finalFigletString = "";

    try {
      if (words.length >= 3) {
        let linesForFiglet = [];
        let currentLine = "";
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          if (word.length > MAX_INPUT_CHARS_PER_LINE) {
            if (currentLine.length > 0) {
              linesForFiglet.push(currentLine);
            }
            currentLine = "";
            linesForFiglet.push(word);
          } else if (currentLine.length > 0 && (currentLine + " " + word).length > MAX_INPUT_CHARS_PER_LINE) {
            linesForFiglet.push(currentLine);
            currentLine = word;
          } else {
            currentLine = currentLine.length > 0 ? currentLine + " " + word : word;
          }
        }
        if (currentLine.length > 0) {
          linesForFiglet.push(currentLine);
        }

        if (linesForFiglet.length === 0 && trimmedInput.length > 0) {
           linesForFiglet.push(trimmedInput);
        }
        if (linesForFiglet.length === 0) {
            linesForFiglet.push(trimmedInput);
        }

        const figletArtBlocksPromises = linesForFiglet.map(line => getFigletArtPromise(line, { font: 'Standard' }));
        const figletArtBlocks = await Promise.all(figletArtBlocksPromises);

        const blockWidths = figletArtBlocks.map(block =>
          Math.max(0, ...block.split('\n').map(l => l.length))
        );
        const maxWidthOfAllBlocks = Math.max(0, ...blockWidths);

        let allCenteredLines = [];
        figletArtBlocks.forEach(block => {
          block.split('\n').forEach(line => {
            const paddingNeeded = Math.floor((maxWidthOfAllBlocks - line.length) / 2);
            allCenteredLines.push(' '.repeat(Math.max(0, paddingNeeded)) + line);
          });
        });
        finalFigletString = allCenteredLines.join('\n');
      } else if (trimmedInput.length > 0) {
        const rawFigletOutput = await getFigletArtPromise(trimmedInput, { font: 'Standard' });
        finalFigletString = rawFigletOutput;
      }

      setAsciiArt(finalFigletString);
      const tempGridForSizing = initializeGridFromAscii(finalFigletString, INITIAL_NEON_PURPLE);
      setGameOfLifeGrid(tempGridForSizing);

      if (tempGridForSizing && tempGridForSizing.length > 0 && tempGridForSizing[0]) {
        const gridCharWidth = tempGridForSizing[0].length;

        const minCharsForCalc = 20;
        const maxCharsForCalc = 120;
        const effectiveGridCharWidth = Math.max(minCharsForCalc, Math.min(gridCharWidth, maxCharsForCalc));

        const preferredFontSizeCalc = `calc(97vw / ${effectiveGridCharWidth})`;
        setDynamicFontSize(`clamp(${minFontSizePx}px, ${preferredFontSizeCalc}, ${maxFontSizePx}px)`);
      } else {
        setDynamicFontSize(`${minFontSizePx}px`);
      }

    } catch (error) {
      console.error('Figlet/text processing error:', error);
      setAsciiArt('Error generating ASCII art.');
      setGameOfLifeGrid(null);
      setDynamicFontSize(`${minFontSizePx}px`);
    }
  };

  const gridToAsciiDisplay = (grid) => {
    if (!grid || grid.length === 0) return '';
    return grid.map(row => row.map(cell => (cell ? cell.char : DEAD_CELL_CHAR)).join('')).join('\n');
  }

  const simulationStep = () => {
    setGameOfLifeGrid(prevGrid => {
      if (!prevGrid) {
        clearInterval(simulationIntervalId.current)
        setIsSimulating(false)
        return null;
      }
      const newGrid = getNextGeneration(prevGrid, NEWBORN_CELL_CHAR, getRandomNeonColor, INITIAL_NEON_PURPLE);

      let nextStableCount = 0;
      if (isPatternStable(prevGrid, newGrid)) {
        nextStableCount = stableGenerationCount + 1;
      }
      setStableGenerationCount(nextStableCount);

      if (isEmpty(newGrid) || nextStableCount >= 10) {
        clearInterval(simulationIntervalId.current);
        setIsSimulating(false);
        setAsciiArt(gridToAsciiDisplay(newGrid));
      } else {
        setAsciiArt(gridToAsciiDisplay(newGrid));
      }
      return newGrid;
    });
  }

  const handleDestroyClick = () => {
    if (isSimulating || !asciiArt ) return;

    const initialGrid = initializeGridFromAscii(asciiArt, INITIAL_NEON_PURPLE);

    if (isEmpty(initialGrid)) {
        setAsciiArt("Original pattern is empty. Nothing to simulate.");
        setGameOfLifeGrid(null);
        return;
    }
    setStableGenerationCount(0);
    setGameOfLifeGrid(initialGrid);
    setIsSimulating(true);
    simulationIntervalId.current = setInterval(simulationStep, SIMULATION_SPEED_MS);
  }

  const renderGridToCanvas = (grid, canvasElement, initialPurpleColor) => {
    const ctx = canvasElement.getContext('2d');
    if (!grid || grid.length === 0 || !grid[0] || !ctx) {
      if (ctx) ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      return;
    }

    const gridHeight = grid.length;
    const gridWidth = grid[0].length;

    canvasElement.width = gridWidth * GIF_CANVAS_CHAR_WIDTH_PX;
    canvasElement.height = gridHeight * GIF_CANVAS_LINE_HEIGHT_PX;

    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    ctx.font = `${GIF_CANVAS_FONT_SIZE_PX}px monospace`;
    ctx.textBaseline = 'top';

    for (let r = 0; r < gridHeight; r++) {
      for (let c = 0; c < gridWidth; c++) {
        const cell = grid[r][c];
        if (cell) {
          ctx.fillStyle = cell.color || initialPurpleColor;
          ctx.fillText(cell.char, c * GIF_CANVAS_CHAR_WIDTH_PX, r * GIF_CANVAS_LINE_HEIGHT_PX);
        }
      }
    }
  };

  const handleStartGifExport = async () => {
    let currentGridSource = gameOfLifeGrid;
    if (!currentGridSource && asciiArt) {
      currentGridSource = initializeGridFromAscii(asciiArt, INITIAL_NEON_PURPLE);
    }

    if (!currentGridSource || isEmpty(currentGridSource)) {
      alert("Please generate some art or have a non-empty pattern first!");
      return;
    }

    setIsGeneratingGif(true);
    setGifProgress('Initializing GIF export...');

    // const gif = new GIF({ workers: 2, quality: 10, workerScript: '/path/to/gif.worker.js' });
    console.log("Conceptual: Initializing GIF Encoder");

    const offscreenCanvas = document.createElement('canvas');
    let currentSimGrid = JSON.parse(JSON.stringify(currentGridSource));

    try {
      setGifProgress('Capturing initial static frames...');
      renderGridToCanvas(currentSimGrid, offscreenCanvas, INITIAL_NEON_PURPLE);
      for (let i = 0; i < GIF_STATIC_FRAME_COUNT; i++) {
        // gif.addFrame(offscreenCanvas, { copy: true, delay: GIF_STATIC_FRAME_DELAY_MS });
        console.log(`Conceptual GIF: Added static frame ${i + 1} with delay ${GIF_STATIC_FRAME_DELAY_MS}`);
        if (i < GIF_STATIC_FRAME_COUNT -1) await new Promise(r => setTimeout(r, 50));
      }

      setGifProgress('Simulating Game of Life for GIF...');
      let frameCount = 0;
      let localStablePatternCount = 0;
      const gridPatternHistory = [];

      while (frameCount < (GIF_MAX_TOTAL_FRAMES - GIF_STATIC_FRAME_COUNT)) {
        renderGridToCanvas(currentSimGrid, offscreenCanvas, INITIAL_NEON_PURPLE);
        // gif.addFrame(offscreenCanvas, { copy: true, delay: GIF_SIMULATION_FRAME_DELAY_MS });
        console.log(`Conceptual GIF: Added simulation frame ${frameCount + 1} with delay ${GIF_SIMULATION_FRAME_DELAY_MS}`);

        if (frameCount < (GIF_MAX_TOTAL_FRAMES - GIF_STATIC_FRAME_COUNT) -1 ) await new Promise(r => setTimeout(r, 50));

        const prevSimGrid = JSON.parse(JSON.stringify(currentSimGrid));
        currentSimGrid = getNextGeneration(currentSimGrid, NEWBORN_CELL_CHAR, getRandomNeonColor, INITIAL_NEON_PURPLE);
        frameCount++;

        const currentPatternForLoopCheck = gridToAsciiDisplay(currentSimGrid);
        gridPatternHistory.push(currentPatternForLoopCheck);
        if (gridPatternHistory.length > GIF_LOOP_DETECTION_HISTORY_SIZE) {
          gridPatternHistory.shift();
        }

        if (isEmpty(currentSimGrid)) {
          setGifProgress('Simulation empty. Finalizing GIF.');
          renderGridToCanvas(currentSimGrid, offscreenCanvas, INITIAL_NEON_PURPLE);
          // gif.addFrame(offscreenCanvas, { copy: true, delay: GIF_SIMULATION_FRAME_DELAY_MS });
          console.log(`Conceptual GIF: Added final empty frame.`);
          break;
        }

        if (isPatternStable(prevSimGrid, currentSimGrid)) {
          localStablePatternCount++;
          if (localStablePatternCount >= 5) {
            setGifProgress('Pattern stable. Capturing final loop and finalizing GIF.');
            for (let stableFrame = 0; stableFrame < 3; stableFrame++) {
               if (frameCount >= GIF_MAX_TOTAL_FRAMES - GIF_STATIC_FRAME_COUNT) break;
               renderGridToCanvas(currentSimGrid, offscreenCanvas, INITIAL_NEON_PURPLE);
               // gif.addFrame(offscreenCanvas, { copy: true, delay: GIF_SIMULATION_FRAME_DELAY_MS });
               console.log(`Conceptual GIF: Added final stable frame ${stableFrame + 1}`);
               if (stableFrame < 2) await new Promise(r => setTimeout(r, 50));
               frameCount++;
            }
            break;
          }
        } else {
          localStablePatternCount = 0;
          let oscillationDetected = false;
          for (let P = 2; P <= 5; P++) {
            if (gridPatternHistory.length > P) {
              const pastPatternIndex = gridPatternHistory.length - 1 - P;
              if (pastPatternIndex >=0 && gridPatternHistory[pastPatternIndex] === currentPatternForLoopCheck) {
                setGifProgress(`Oscillation (P=${P}) detected. Capturing ${GIF_OSCILLATOR_CYCLES_TO_CAPTURE} cycle(s)...`);
                let tempLoopGrid = JSON.parse(JSON.stringify(currentSimGrid));
                for (let oscFrame = 0; oscFrame < (P * GIF_OSCILLATOR_CYCLES_TO_CAPTURE) -1 ; oscFrame++) {
                  if (frameCount >= GIF_MAX_TOTAL_FRAMES - GIF_STATIC_FRAME_COUNT) break;
                  tempLoopGrid = getNextGeneration(tempLoopGrid, NEWBORN_CELL_CHAR, getRandomNeonColor, INITIAL_NEON_PURPLE);
                  renderGridToCanvas(tempLoopGrid, offscreenCanvas, INITIAL_NEON_PURPLE);
                  // gif.addFrame(...)
                  console.log(`Conceptual GIF: Added oscillator frame ${oscFrame + 1}`);
                  await new Promise(r => setTimeout(r, 50));
                  frameCount++;
                }
                oscillationDetected = true;
                break;
              }
            }
          }
          if (oscillationDetected) break;
        }
      }

      if(frameCount >= GIF_MAX_TOTAL_FRAMES - GIF_STATIC_FRAME_COUNT && isSimulating) setGifProgress('Max simulation frames reached. Finalizing GIF.');
      else if (!isSimulating && frameCount > 0) setGifProgress('Simulation ended. Finalizing GIF.');


      setGifProgress('Encoding GIF (simulated)...');

      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log("Conceptual GIF: Encoding complete. Triggering download.");

      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const a = document.createElement('a');
        const simulatedBlob = new Blob(["Simulated GIF content placeholder"], {type : 'image/gif'});
        a.href = URL.createObjectURL(simulatedBlob);
        a.download = 'conways-game-of-life-simulated.gif';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }
      setGifProgress('GIF Generated (simulated)!');

    } catch (error) {
      console.error("Error generating GIF:", error);
      setGifProgress(`Error: ${error.message || 'Failed to generate GIF.'}`);
    } finally {
      setTimeout(() => {
           setIsGeneratingGif(false);
      }, 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (simulationIntervalId.current) {
        clearInterval(simulationIntervalId.current)
      }
    }
  }, [])

  useEffect(() => {
    if ((!asciiArt || !gameOfLifeGrid) && isSimulating) {
      clearInterval(simulationIntervalId.current);
      setIsSimulating(false);
      setGameOfLifeGrid(null);
    }
  }, [asciiArt, gameOfLifeGrid, isSimulating]);

  return (
    <>
      <Head>
        <title>Conway's Game of Life</title>
        <meta name="description" content="Generate ASCII art and watch it evolve with Conway's Game of Life" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:title" content="Conway's Game of Life - Interactive Simulation & ASCII Art" />
        <meta property="og:image" content="/images/frame-image.png" />
        <meta name="fc:frame" content={stringifiedFrameMetadata} />
      </Head>
      <main className={styles.mainContentArea}>
        <div style={{ textAlign: 'right', padding: '10px 20px 0 0' }}>
          <button onClick={() => setShowAboutModal(true)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1em' }}>
            About
          </button>
        </div>
        <h1>Conway's Game of Life</h1>
        <div className={styles.controls}>
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Enter text"
          />
          <button onClick={generateAsciiArt} className={styles.generateButton}>
            Generate
          </button>
        </div>

        {(gameOfLifeGrid || asciiArt) && (
          <div className={styles.asciiArtContainer}>
            {gameOfLifeGrid ? (
              <pre className={styles.asciiArt} style={{ fontSize: dynamicFontSize, whiteSpace: 'pre', lineHeight: '1.0' }}>
                {gameOfLifeGrid.map((row, rowIndex) => (
                  <div key={rowIndex}>
                    {row.map((cell, colIndex) => {
                      const cellColor = cell ? cell.color : 'inherit';
                      return (
                        <span key={colIndex} style={{ color: cellColor }}>
                          {cell ? cell.char : DEAD_CELL_CHAR}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </pre>
            ) : (
              asciiArt && <pre className={styles.asciiArt} style={{color: INITIAL_NEON_PURPLE, fontSize: dynamicFontSize, whiteSpace: 'pre', lineHeight: '1.0'}}>{asciiArt}</pre>
            )}
          </div>
        )}

        {(gameOfLifeGrid || asciiArt) && (
          <div
            className={styles.actionButtonsContainer}
            style={{
              width: 'calc(100vw - 40px)',
              maxWidth: '1200px',
              margin: '10px auto 0 auto',
            }}
          >
            <button
              onClick={handleDestroyClick}
              className={styles.destroyButton}
              disabled={isSimulating || isGeneratingGif || !gameOfLifeGrid || (gameOfLifeGrid && isEmpty(gameOfLifeGrid))}
            >
              {isSimulating ? 'Simulating...' : 'Destroy'}
            </button>
            <button
              onClick={handleStartGifExport}
              className={styles.exportGifButton}
              disabled={isGeneratingGif || isSimulating || (!gameOfLifeGrid && !asciiArt) || (gameOfLifeGrid && isEmpty(gameOfLifeGrid))}
            >
              {isGeneratingGif ? 'Generating GIF...' : 'Export GIF'}
            </button>
          </div>
        )}
        {isGeneratingGif && gifProgress && (
            <div
                className={styles.gifProgressMessage}
                style={{
                    width: 'calc(100vw - 40px)',
                    maxWidth: '1200px',
                    margin: '10px auto',
                    textAlign: 'center',
                    color: '#ccc'
                }}
            >
                {gifProgress}
            </div>
        )}

        <AsciiDonut />

        {showAboutModal && (
          <div className={styles.aboutModalOverlay}>
            <div className={styles.aboutModalContent}>
              <h2>About This Application</h2>
              <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'inherit', fontSize: '0.9em' }}>
                {aboutText}
              </pre>
              <button onClick={() => setShowAboutModal(false)} className={styles.modalCloseButton}>
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
