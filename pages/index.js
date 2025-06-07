import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import figlet from 'figlet'
import styles from '../styles/Home.module.css'
import { initializeGridFromAscii, getNextGeneration, isStable, isEmpty } from '../lib/gameOfLife'

const SIMULATION_SPEED_MS = 200; // ms per generation
// const LIVE_CELL_CHAR = '#'; // Potentially obsolete, replaced by NEWBORN_CELL_CHAR for new cells
const DEAD_CELL_CHAR = ' ';
const NEWBORN_CELL_CHAR = '#';

export default function Home() {
  const [inputText, setInputText] = useState('')
  const [asciiArt, setAsciiArt] = useState('')
  const [gameOfLifeGrid, setGameOfLifeGrid] = useState(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const simulationIntervalId = useRef(null)

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
        setAsciiArt(data)
        setGameOfLifeGrid(initializeGridFromAscii(data));
      })
    } catch (error) {
      console.error('Figlet processing error:', error)
      setAsciiArt('Error generating ASCII art.')
      setGameOfLifeGrid(null)
    }
  }

  const gridToAscii = (grid) => {
    if (!grid || grid.length === 0) return '';
    return grid.map(row => row.map(cell => (cell !== null ? cell : DEAD_CELL_CHAR)).join('')).join('\n');
  }

  const simulationStep = () => {
    setGameOfLifeGrid(prevGrid => {
      if (!prevGrid) {
        clearInterval(simulationIntervalId.current)
        setIsSimulating(false)
        return null;
      }
      const newGrid = getNextGeneration(prevGrid, NEWBORN_CELL_CHAR);
      setAsciiArt(gridToAscii(newGrid));

      if (isStable(prevGrid, newGrid) || isEmpty(newGrid)) {
        clearInterval(simulationIntervalId.current)
        setIsSimulating(false)
        return newGrid; // Keep the final state
      }
      return newGrid;
    });
  }

  const handleDestroyClick = () => {
    if (isSimulating || !asciiArt) return;

    const initialGrid = initializeGridFromAscii(asciiArt);
    if (isEmpty(initialGrid)) {
        setAsciiArt("Nothing to destroy (empty pattern).");
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

  // Effect to stop simulation if asciiArt is cleared by other means
  useEffect(() => {
    if (!asciiArt && isSimulating) {
      clearInterval(simulationIntervalId.current);
      setIsSimulating(false);
      setGameOfLifeGrid(null);
    }
  }, [asciiArt, isSimulating]);


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
        {asciiArt && (
          <div className={styles.asciiArtContainer}>
            <pre className={styles.asciiArt}>{asciiArt}</pre>
            <button onClick={handleDestroyClick} className={styles.destroyButton} disabled={isSimulating || !gameOfLifeGrid}>
              {isSimulating ? 'Simulating...' : 'Destroy'}
            </button>
          </div>
        )}
      </main>
    </>
  )
}
