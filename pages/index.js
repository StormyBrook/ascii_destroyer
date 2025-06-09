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
const NEON_COLORS = [INITIAL_NEON_PURPLE, '#FFFF00', '#00FFFF']; // Orange changed to INITIAL_NEON_PURPLE, Yellow, Cyan (blue)


export default function Home() {
  const [inputText, setInputText] = useState('')
  const [asciiArt, setAsciiArt] = useState('') // Stores the original Figlet output string
  const [gameOfLifeGrid, setGameOfLifeGrid] = useState(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const simulationIntervalId = useRef(null)
  const [stableGenerationCount, setStableGenerationCount] = useState(0);

  const getRandomNeonColor = () => {
    return NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
  };

  const handleInputChange = (event) => {
    setInputText(event.target.value)
  }

  const generateAsciiArt = async () => {
    // New logic to stop ongoing simulation
    if (isSimulating) {
      if (simulationIntervalId.current) {
        clearInterval(simulationIntervalId.current);
        simulationIntervalId.current = null;
      }
      setIsSimulating(false);
      setStableGenerationCount(0); // Reset the counter
    }

    // Existing logic for generating new art
    if (!inputText) {
      setAsciiArt('')
      setGameOfLifeGrid(null)
      setStableGenerationCount(0); // Also reset stableGenerationCount here if clearing the art
      return
    }

    // Reset stableGenerationCount here too, as we are starting a new Figlet generation
    setStableGenerationCount(0);

    try {
      figlet.text(inputText, { font: 'Standard' }, (err, data) => {
        if (err) {
          console.error('Figlet error:', err)
          setAsciiArt('Error generating ASCII art.')
          setGameOfLifeGrid(null)
          return
        }
        // setStableGenerationCount(0); // This was moved up
        setAsciiArt(data);
        // Initialize grid with the initial color for Game of Life
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
      const newGrid = getNextGeneration(prevGrid, NEWBORN_CELL_CHAR, getRandomNeonColor, INITIAL_NEON_PURPLE);

      let nextStableCount = 0;
      if (isPatternStable(prevGrid, newGrid)) { // Use isPatternStable here
        // Access stableGenerationCount from the closure of the Home component,
        // not from a potentially stale prevGrid or a new state value not yet applied.
        nextStableCount = stableGenerationCount + 1;
      }
      // This setStableGenerationCount will schedule an update.
      // The `nextStableCount` used in the condition below is the one calculated in this step.
      setStableGenerationCount(nextStableCount);

      if (isEmpty(newGrid) || nextStableCount >= 10) {
        clearInterval(simulationIntervalId.current);
        setIsSimulating(false);
        setAsciiArt(gridToAsciiDisplay(newGrid));
        // gameOfLifeGrid will be updated by the return value
      } else {
        setAsciiArt(gridToAsciiDisplay(newGrid));
      }
      return newGrid;
    });
  }

  const handleDestroyClick = () => {
    if (isSimulating || !asciiArt ) return; // Ensure asciiArt (original figlet output) exists

    const initialGrid = initializeGridFromAscii(asciiArt, INITIAL_NEON_PURPLE);

    if (isEmpty(initialGrid)) {
        setAsciiArt("Original pattern is empty. Nothing to simulate.");
        setGameOfLifeGrid(null);
        return;
    }
    setStableGenerationCount(0); // Reset before starting simulation
    setGameOfLifeGrid(initialGrid);
    setIsSimulating(true);
    simulationIntervalId.current = setInterval(simulationStep, SIMULATION_SPEED_MS);
  }

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (simulationIntervalId.current) {
        clearInterval(simulationIntervalId.current)
      }
    }
  }, [])

  // Effect to stop simulation if asciiArt is cleared by other means,
  // or if gameOfLifeGrid becomes null (e.g. new text input cleared it)
  useEffect(() => {
    if ((!asciiArt || !gameOfLifeGrid) && isSimulating) {
      clearInterval(simulationIntervalId.current);
      setIsSimulating(false);
      setGameOfLifeGrid(null); // Ensure grid is also cleared
    }
  }, [asciiArt, gameOfLifeGrid, isSimulating]);

  return (
    <>
      <Head>
        <title>Conway's Game of Life</title>
        <meta name="description" content="Generate ASCII art and watch it evolve with Conway's Game of Life" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
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
        {/* Render based on gameOfLifeGrid for dynamic colors */}
        {gameOfLifeGrid && (
          <div className={styles.asciiArtContainer}>
            <pre className={styles.asciiArt}>
              {gameOfLifeGrid.map((row, rowIndex) => (
                <div key={rowIndex}>
                  {row.map((cell, colIndex) => (
                    <span key={colIndex} style={{ color: cell ? cell.color : 'inherit' }}>
                      {cell ? cell.char : DEAD_CELL_CHAR}
                    </span>
                  ))}
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
        {/* Fallback for initial display from figlet before simulation or if grid is cleared */}
        {!gameOfLifeGrid && asciiArt && (
           <div className={styles.asciiArtContainer}>
            <pre className={styles.asciiArt} style={{color: INITIAL_NEON_PURPLE}}>{asciiArt}</pre>
            <button
              onClick={handleDestroyClick}
              className={styles.destroyButton}
              disabled={!asciiArt} // Disable if no asciiArt to initialize from
            >
              Destroy
            </button>
          </div>
        )}
        {/* Fallback for initial display from figlet before simulation or if grid is cleared */}
        {!gameOfLifeGrid && asciiArt && (
           <div className={styles.asciiArtContainer}>
            <pre className={styles.asciiArt} style={{color: INITIAL_NEON_PURPLE}}>{asciiArt}</pre>
            <button
              onClick={handleDestroyClick}
              className={styles.destroyButton}
              disabled={!asciiArt} // Disable if no asciiArt to initialize from
            >
              Destroy
            </button>
          </div>
        )}

        <AsciiDonut /> {/* Add the donut component here */}
      </main>
    </>
  )
}
