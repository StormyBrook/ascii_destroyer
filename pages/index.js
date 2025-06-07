import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import figlet from 'figlet'
import styles from '../styles/Home.module.css'
import { initializeGridFromAscii, getNextGeneration, isStable, isEmpty } from '../lib/gameOfLife'

const SIMULATION_SPEED_MS = 200; // ms per generation
const DEAD_CELL_CHAR = ' ';
const NEWBORN_CELL_CHAR = '#';

const NEON_COLORS = ['#FF00FF', '#FFFF00', '#00FFFF']; // Magenta (pink), Yellow, Cyan (blue)
const INITIAL_NEON_PURPLE = '#DA70D6'; // Orchid, as a distinct purple


export default function Home() {
  const [inputText, setInputText] = useState('')
  const [asciiArt, setAsciiArt] = useState('') // Stores the original Figlet output string
  const [gameOfLifeGrid, setGameOfLifeGrid] = useState(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const simulationIntervalId = useRef(null)

  const getRandomNeonColor = () => {
    return NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
  };

  const handleInputChange = (event) => {
    setInputText(event.target.value)
  }

  const generateAsciiArt = async () => {
    if (isSimulating) return;
    if (!inputText) {
      setAsciiArt('')
      setGameOfLifeGrid(null)
      return
    }
    try {
      figlet.text(inputText, { font: 'Doh' }, (err, data) => {
        if (err) {
          console.error('Figlet error:', err)
          setAsciiArt('Error generating ASCII art.')
          setGameOfLifeGrid(null)
          return
        }
        setAsciiArt(data) // Store the raw Figlet output
        // Initialize grid with the initial color for Game of Life
        setGameOfLifeGrid(initializeGridFromAscii(data, INITIAL_NEON_PURPLE));
      })
    } catch (error) {
      console.error('Figlet processing error:', error)
      setAsciiArt('Error generating ASCII art.')
      setGameOfLifeGrid(null)
    }
  }

  // This function is now primarily for converting the GoL grid to a string for display
  // if we needed to display it as a single string again, or for other logic.
  // The main display is handled by mapping gameOfLifeGrid to JSX.
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
      const newGrid = getNextGeneration(prevGrid, NEWBORN_CELL_CHAR, getRandomNeonColor);
      // setAsciiArt(gridToAsciiDisplay(newGrid)); // Update asciiArt state if needed for other purposes

      if (isStable(prevGrid, newGrid) || isEmpty(newGrid)) {
        clearInterval(simulationIntervalId.current)
        setIsSimulating(false)
        // Update asciiArt to the final state from gameOfLifeGrid for consistency
        setAsciiArt(gridToAsciiDisplay(newGrid));
        return newGrid; // Keep the final state
      }
      // Update asciiArt for continuous display during simulation if needed,
      // but primary rendering is from gameOfLifeGrid.
      // Forcing a re-render of the <pre> tag by updating asciiArt if it were used directly.
      // However, since we map gameOfLifeGrid directly, this setAsciiArt call here for intermediate steps
      // is mostly for if we had another component relying on the string state of asciiArt.
      // For the <pre> tag using gameOfLifeGrid, this specific call is not strictly necessary for display update.
      setAsciiArt(gridToAsciiDisplay(newGrid));
      return newGrid;
    });
  }

  const handleDestroyClick = () => {
    if (isSimulating || !asciiArt ) return; // Ensure asciiArt (original figlet output) exists

    // Initialize grid for simulation using the currently displayed asciiArt (which should be the figlet output)
    const initialGrid = initializeGridFromAscii(asciiArt, INITIAL_NEON_PURPLE);

    if (isEmpty(initialGrid)) {
        // If the initial figlet art was empty or all spaces
        setAsciiArt("Original pattern is empty. Nothing to simulate.");
        setGameOfLifeGrid(null);
        return;
    }

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
        <title>ASCII Art Generator & Game of Life</title>
        <meta name="description" content="Generate ASCII art and watch it evolve with Conway's Game of Life" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <h1>ASCII Art Generator & Game of Life</h1>
        <div className={styles.controls}>
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Enter text"
            disabled={isSimulating}
          />
          <button onClick={generateAsciiArt} className={styles.generateButton} disabled={isSimulating}>
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
      </main>
    </>
  )
}
