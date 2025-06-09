import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import figlet from 'figlet'
import styles from '../styles/Home.module.css'
import { initializeGridFromAscii, getNextGeneration, isStable, isEmpty, isPatternStable } from '../lib/gameOfLife'
import AsciiDonut from '../components/AsciiDonut';

const SIMULATION_SPEED_MS = 200; // ms per generation
const DEAD_CELL_CHAR = ' ';
const NEWBORN_CELL_CHAR = '#';

const INITIAL_NEON_PURPLE = '#c084fc'; // Orchid, as a distinct purple
const NEON_COLORS = [INITIAL_NEON_PURPLE, '#FFFF00', '#00FFFF']; // Purple, Yellow, Cyan

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
  const [colorMode, setColorMode] = useState('colorful'); // 'colorful' or 'purple'

  const getRandomNeonColor = () => {
    return NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
  };

  const handleInputChange = (event) => {
    setInputText(event.target.value)
  }

  const generateAsciiArt = async () => {
    if (isSimulating) {
      if (simulationIntervalId.current) {
        clearInterval(simulationIntervalId.current);
        simulationIntervalId.current = null;
      }
      setIsSimulating(false);
      setStableGenerationCount(0);
    }

    if (!inputText) {
      setAsciiArt('')
      setGameOfLifeGrid(null)
      setStableGenerationCount(0);
      return
    }

    setStableGenerationCount(0);

    try {
      figlet.text(inputText, { font: 'Standard' }, (err, data) => {
        if (err) {
          console.error('Figlet error:', err)
          setAsciiArt('Error generating ASCII art.')
          setGameOfLifeGrid(null)
          return
        }
        setAsciiArt(data);
        setGameOfLifeGrid(initializeGridFromAscii(data, INITIAL_NEON_PURPLE));
      })
    } catch (error) {
      console.error('Figlet processing error:', error)
      setAsciiArt('Error generating ASCII art.')
      setGameOfLifeGrid(null)
    }
  }

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
      const newGrid = getNextGeneration(prevGrid, NEWBORN_CELL_CHAR, getRandomNeonColor, INITIAL_NEON_PURPLE, colorMode);

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
      <main>
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
        <div className={styles.colorModeControls} style={{ marginTop: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setColorMode('colorful')}
            disabled={colorMode === 'colorful' || isSimulating}
            style={{ marginRight: '10px', padding: '8px 12px', borderRadius: '4px', border: '1px solid #555', backgroundColor: colorMode === 'colorful' && !isSimulating ? '#6b46c1' : '#333', color: 'white', cursor: (colorMode === 'colorful' || isSimulating) ? 'not-allowed' : 'pointer' }}
          >
            Colorful
          </button>
          <button
            onClick={() => setColorMode('purple')}
            disabled={colorMode === 'purple' || isSimulating}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #555', backgroundColor: colorMode === 'purple' && !isSimulating ? '#6b46c1' : '#333', color: 'white', cursor: (colorMode === 'purple' || isSimulating) ? 'not-allowed' : 'pointer' }}
          >
            Purple
          </button>
        </div>
        {gameOfLifeGrid && (
          <div className={styles.asciiArtContainer}>
            <pre className={styles.asciiArt}>
              {gameOfLifeGrid.map((row, rowIndex) => (
                <div key={rowIndex}>
                  {row.map((cell, colIndex) => {
                    let cellColor = 'inherit';
                    if (cell) {
                      cellColor = colorMode === 'purple' ? INITIAL_NEON_PURPLE : cell.color;
                    }
                    return (
                      <span key={colIndex} style={{ color: cellColor }}>
                        {cell ? cell.char : DEAD_CELL_CHAR}
                      </span>
                    );
                  })}
                </div>
              ))}
            </pre>
            <button
              onClick={handleDestroyClick}
              className={styles.destroyButton}
              disabled={isSimulating || !gameOfLifeGrid || isEmpty(gameOfLifeGrid)}
            >
              {isSimulating ? 'Simulating...' : 'Destroy'}
            </button>
          </div>
        )}
        {!gameOfLifeGrid && asciiArt && (
           <div className={styles.asciiArtContainer}>
            <pre className={styles.asciiArt} style={{color: INITIAL_NEON_PURPLE}}>{asciiArt}</pre>
            <button
              onClick={handleDestroyClick}
              className={styles.destroyButton}
              disabled={!asciiArt}
            >
              Destroy
            </button>
          </div>
        )}
        <AsciiDonut />
      </main>
    </>
  )
}
