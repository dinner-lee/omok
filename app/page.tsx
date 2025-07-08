"use client"; // 이 줄을 파일 맨 위에 추가

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Player 인터페이스 정의
interface Player {
  id: number;
  name: string;
  emoji: string;
  turns: number;
  color: string;
}

// Main App Component
const App = () => {
  // Game state variables
  const [boardSize, setBoardSize] = useState(12); // Initial board size
  const [board, setBoard] = useState<(number | null)[][]>([]); // 2D array representing the game board, explicitly typed
  const [players, setPlayers] = useState<Player[]>([ // Player data
    { id: 0, name: '플레이어 1', emoji: '🔴', turns: 0, color: 'bg-red-500' },
    { id: 1, name: '플레이어 2', emoji: '🔵', turns: 0, color: 'bg-blue-500' },
    { id: 2, name: '플레이어 3', emoji: '🟢', turns: 0, color: 'bg-green-500' },
  ]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0); // Index of the current player
  const [timer, setTimer] = useState(20); // Current timer value
  const [gameStarted, setGameStarted] = useState(false); // Flag to indicate if the game has started
  const [winner, setWinner] = useState<Player | null>(null); // Stores the winning player object, now explicitly typed
  const [isEmojiSelectionOpen, setIsEmojiSelectionOpen] = useState(true); // Controls emoji selection modal visibility
  const [selectedEmojis, setSelectedEmojis] = useState<{ [key: number]: string }>({}); // Stores selected emojis for each player
  const [boardExtensionValue, setBoardExtensionValue] = useState(0); // Value for board extension input
  const [alertMessage, setAlertMessage] = useState<string | null>(null); // State for custom alert message
  const [isPaused, setIsPaused] = useState(false); // New state for pause functionality

  // Fixed background image URL as requested by the user
  const backgroundImage = 'https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg';

  // Ref for the timer interval
  const timerRef = useRef<NodeJS.Timeout | null>(null); // Explicitly type timerRef

  // Available emojis for selection
  const availableEmojis = [
    '😀', '😂', '🥳', '😎', '🤩', '🚀', '🌟', '🌈', '🍕', '🍔',
    '🍩', '�', '🍓', '🍎', '⚽', '🏀', '🏈', '🎲', '🧩', '🏆'
  ];

  // Initialize the board when boardSize changes or component mounts
  useEffect(() => {
    const initialBoard: (number | null)[][] = Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));
    setBoard(initialBoard);
  }, [boardSize]);

  // Function to check for a win (5 in a row) - Defined first as it's a dependency for handleCellClick
  const checkWin = useCallback((currentBoard: (number | null)[][], row: number, col: number, playerId: number) => {
    const directions = [
      [0, 1],   // Horizontal
      [1, 0],   // Vertical
      [1, 1],   // Diagonal (top-left to bottom-right)
      [1, -1]   // Diagonal (top-right to bottom-left)
    ];

    for (const [dr, dc] of directions) {
      let count = 1; // Count of consecutive pieces
      // Check in one direction
      for (let i = 1; i < 5; i++) {
        const r = row + i * dr;
        const c = col + i * dc;
        if (r >= 0 && r < boardSize && c >= 0 && c < boardSize && currentBoard[r][c] === playerId) {
          count++;
        } else {
          break;
        }
      }
      // Check in the opposite direction
      for (let i = 1; i < 5; i++) {
        const r = row - i * dr;
        const c = col - i * dc;
        if (r >= 0 && r < boardSize && c >= 0 && c < boardSize && currentBoard[r][c] === playerId) {
          count++;
        } else {
          break;
        }
      }
      if (count >= 5) {
        return true; // Found 5 in a row
      }
    }
    return false; // No win yet
  }, [boardSize]);

  // Function to handle a cell click (placing a piece) - Defined after checkWin
  const handleCellClick = useCallback((row: number, col: number) => {
    if (board[row][col] !== null || winner || !gameStarted || isPaused) { // Added isPaused condition
      return; // Cannot place on occupied cell, if game is over, not started, or paused
    }

    const newBoard = board.map(arr => [...arr]); // Deep copy the board
    const currentPlayer = players[currentPlayerIndex];
    newBoard[row][col] = currentPlayer.id; // Place current player's piece

    setBoard(newBoard);

    // Update player's turn count
    setPlayers(prevPlayers => prevPlayers.map((p, index) =>
      index === currentPlayerIndex ? { ...p, turns: p.turns + 1 } : p
    ));

    // Check for win condition
    if (checkWin(newBoard, row, col, currentPlayer.id)) {
      setWinner(currentPlayer); // currentPlayer is of type Player, now allowed
      setGameStarted(false); // End the game
    } else {
      // Move to next player
      setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
    }
  }, [board, players, currentPlayerIndex, winner, gameStarted, isPaused, checkWin]); // Added isPaused to dependencies

  // Function to handle a random move when timer runs out - Defined after handleCellClick
  const handleRandomMove = useCallback(() => {
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c] === null) {
          emptyCells.push({ r, c });
        }
      }
    }

    if (emptyCells.length > 0) {
      const randomIndex = Math.floor(Math.random() * emptyCells.length);
      const { r, c } = emptyCells[randomIndex];
      handleCellClick(r, c); // Simulate a click on a random empty cell
    } else {
      // If no empty cells, it's a draw or game over
      setWinner({ id: -1, name: '무승부', emoji: '', turns: 0, color: '' }); // Simplified Player object for draw
      setGameStarted(false);
    }
  }, [board, boardSize, handleCellClick]);

  // Handle timer logic
  useEffect(() => {
    if (!gameStarted || winner || isPaused) { // Added isPaused condition
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    // Determine timer speed based on board occupancy
    const occupiedCells = board.flat().filter(cell => cell !== null).length;
    const totalCells = boardSize * boardSize;
    const timerSpeed = (occupiedCells / totalCells) >= 0.5 ? 5 : 20;
    setTimer(timerSpeed); // Reset timer for the new turn

    // Clear previous interval before setting a new one
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimer((prevTimer) => {
        if (prevTimer <= 1) {
          // Time's up, make a random move
          clearInterval(timerRef.current!); // Use non-null assertion
          handleRandomMove();
          return timerSpeed; // Reset timer for next player
        }
        return prevTimer - 1;
      });
    }, 1000);

    // Cleanup interval on component unmount or when game ends/pauses
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentPlayerIndex, gameStarted, boardSize, board, winner, isPaused, handleRandomMove]); // Added isPaused to dependencies

  // Handle board extension - Defined early to ensure scope
  const handleBoardExtension = () => {
    const newSize = boardSize + (boardExtensionValue); // Removed parseInt and as string
    if (newSize > 12 && !gameStarted) { // Only allow extension before game starts and if new size is greater than 12
      setBoardSize(newSize);
      const newBoard: (number | null)[][] = Array(newSize).fill(null).map(() => Array(newSize).fill(null));
      setBoard(newBoard);
      setBoardExtensionValue(0); // Reset input
    } else if (gameStarted) {
      setAlertMessage("게임 중에는 보드를 확장할 수 없습니다"); // Translated "Cannot extend board during an ongoing game."
    } else if (newSize <= 12) {
      setAlertMessage("보드 크기는 12보다 커야 확장할 수 있습니다"); // Translated "Board size must be greater than 12 to extend."
    }
  };

  // Handle emoji selection for a player
  const handleEmojiSelect = (playerId: number, emoji: string) => {
    setSelectedEmojis(prev => ({ ...prev, [playerId]: emoji }));
  };

  // Start the game after emoji selection
  const startGame = () => {
    // Check if all players have selected an emoji
    if (Object.keys(selectedEmojis).length !== players.length) {
      setAlertMessage('모든 플레이어는 말을 선택해야 합니다'); // Translated "All players must select an emoji!"
      return;
    }

    // Update player emojis based on selection
    setPlayers(prevPlayers => prevPlayers.map(p => ({
      ...p,
      emoji: selectedEmojis[p.id] || p.emoji // Use selected emoji or default
    })));

    setIsEmojiSelectionOpen(false);
    setGameStarted(true);
    setWinner(null); // Clear any previous winner
    setCurrentPlayerIndex(0); // Reset current player
    const initialBoard: (number | null)[][] = Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));
    setBoard(initialBoard); // Reset board
    setPlayers(prevPlayers => prevPlayers.map(p => ({ ...p, turns: 0 }))); // Reset turns
  };

  // Reset the game
  const resetGame = () => {
    setGameStarted(false);
    setWinner(null);
    setIsEmojiSelectionOpen(true); // Re-open emoji selection
    setSelectedEmojis({}); // Clear selected emojis
    setBoardExtensionValue(0); // Reset board extension
    setBoardSize(12); // Reset board size
    setCurrentPlayerIndex(0);
    setPlayers(prevPlayers => prevPlayers.map((p, index) => ({
      ...p,
      turns: 0,
      emoji: index === 0 ? '🔴' : index === 1 ? '🔵' : '🟢' // Reset to default emojis
    })));
    setIsPaused(false); // Ensure game is not paused on reset
  };

  // Toggle pause state
  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  return (
    <>
      {/* Web Font Import */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap');
          body {
            font-family: 'Gowun Dodum', sans-serif;
          }
        `}
      </style>

      <div
        className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url('${backgroundImage}')` }}
      >
        {/* Custom Alert Dialog */}
        {alertMessage && (
          <CustomAlertDialog message={alertMessage} onClose={() => setAlertMessage(null)} />
        )}

        {/* Emoji Selection Modal */}
        {isEmojiSelectionOpen && (
          <EmojiPicker
            players={players}
            availableEmojis={availableEmojis}
            selectedEmojis={selectedEmojis}
            onSelectEmoji={handleEmojiSelect}
            onStartGame={startGame}
            boardExtensionValue={boardExtensionValue}
            setBoardExtensionValue={setBoardExtensionValue}
            handleBoardExtension={handleBoardExtension}
            currentBoardSize={boardSize}
          />
        )}

        {/* Game Over Modal */}
        {winner && (
          <GameOverModal winner={winner} onResetGame={resetGame} />
        )}

        {/* Pause Menu */}
        {isPaused && <PauseMenu onContinue={() => setIsPaused(false)} />}

        {/* Main game content, blurred when paused */}
        <div className={`flex flex-col items-center justify-center p-4 w-full h-full transition-all duration-300 ${isPaused ? 'filter blur-md pointer-events-none' : ''}`}>
          {/* Player Info Bars (Draggable) */}
          {gameStarted && players.map((player, index) => (
            <PlayerInfoBar
              key={player.id}
              player={player}
              isCurrentPlayer={player.id === players[currentPlayerIndex].id}
              timer={timer}
              totalPlayers={players.length}
              playerIndex={index}
            />
          ))}

          {/* Reset Game Button */}
          {gameStarted && (
            <button
              onClick={resetGame}
              className="absolute top-4 left-4 p-3 bg-white/20 text-white rounded-full shadow-lg hover:bg-white/30 transition duration-300 ease-in-out z-50 backdrop-blur-sm" // Liquid Glass style
              title="게임 재시작"
            >
              <span className="text-xl">🔄</span>
            </button>
          )}

          {/* Pause Button */}
          {gameStarted && (
            <button
              onClick={togglePause}
              className="absolute top-4 right-4 p-3 bg-white/20 text-white rounded-full shadow-lg hover:bg-white/30 transition duration-300 ease-in-out z-50 backdrop-blur-sm" // Liquid Glass style
              title="게임 일시정지"
            >
              <span className="text-xl">⏸️</span>
            </button>
          )}

          {/* Game Board */}
          {gameStarted && (
            <GameBoard
              board={board}
              boardSize={boardSize}
              onCellClick={handleCellClick}
              players={players}
            />
          )}
        </div>
      </div>
    </>
  );
};

// GameBoard Component
const GameBoard = ({ board, boardSize, onCellClick, players }) => {
  return (
    <div
      className="grid gap-0.5 bg-white/10 p-1 rounded-2xl shadow-xl backdrop-blur-md" // Liquid Glass effect - more transparent
      style={{
        gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${boardSize}, minmax(0, 1fr))`,
        width: 'min(90vw, 600px)', // Responsive width
        height: 'min(90vw, 600px)', // Responsive height
      }}
    >
      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className="w-full h-full bg-white/20 flex items-center justify-center rounded-lg cursor-pointer hover:bg-white/40 transition duration-150 ease-in-out backdrop-blur-sm" // Liquid Glass effect - more transparent
            onClick={() => onCellClick(rowIndex, colIndex)}
          >
            {cell !== null && (
              <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
                {players[cell].emoji}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
};

// PlayerInfoBar Component (Draggable and Snappable)
const PlayerInfoBar = ({ player, isCurrentPlayer, timer, totalPlayers, playerIndex }) => {
  const barRef = useRef<HTMLDivElement>(null); // Explicitly type useRef
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [snappedTo, setSnappedTo] = useState<string | null>(null); // 'top', 'bottom', 'left', 'right'

  // Base dimensions for the horizontal bar
  const baseWidth = 180; // px
  const baseHeight = 80; // px

  // Initial positioning based on player index
  useEffect(() => {
    const initialPositioning = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      let initialX: number, initialY: number, initialSnappedTo: string;

      // Distribute players around the edges
      if (playerIndex === 0) { // Top-left
        initialX = 20;
        initialY = 20;
        initialSnappedTo = 'top'; // Initially horizontal
      } else if (playerIndex === 1) { // Top-right
        initialX = screenWidth - baseWidth - 20; // Use baseWidth for horizontal
        initialY = 20;
        initialSnappedTo = 'top';
      } else { // Bottom-center
        initialX = (screenWidth - baseWidth) / 2;
        initialY = screenHeight - baseHeight - 20;
        initialSnappedTo = 'bottom';
      }
      setPosition({ x: initialX, y: initialY });
      setSnappedTo(initialSnappedTo);
    };

    initialPositioning();
    window.addEventListener('resize', initialPositioning);
    return () => window.removeEventListener('resize', initialPositioning);
  }, [playerIndex, baseWidth, baseHeight]);

  // Function to snap the bar to the nearest edge
  const snapToEdge = useCallback(() => {
    const bar = barRef.current;
    if (!bar) return;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const snapThreshold = 50; // Pixels from edge to snap

    let newX = position.x;
    let newY = position.y;
    let newSnappedTo: string | null = null;

    // Calculate distances to all four edges using the *base* dimensions
    const distances = {
      top: position.y,
      bottom: screenHeight - (position.y + baseHeight),
      left: position.x,
      right: screenWidth - (position.x + baseWidth)
    };

    let minDistance = Infinity;
    let closestEdge: string | null = null;

    for (const edge in distances) {
      if (distances[edge as keyof typeof distances] < minDistance) { // Type assertion
        minDistance = distances[edge as keyof typeof distances];
        closestEdge = edge;
      }
    }

    if (closestEdge && minDistance < snapThreshold) {
      newSnappedTo = closestEdge;
      if (closestEdge === 'top') {
        newY = 10;
        newX = Math.max(10, Math.min(screenWidth - baseWidth - 10, newX)); // Clamp X to horizontal bounds
      } else if (closestEdge === 'bottom') {
        newY = screenHeight - baseHeight - 10;
        newX = Math.max(10, Math.min(screenWidth - baseWidth - 10, newX)); // Clamp X to horizontal bounds
      } else if (closestEdge === 'left') {
        newX = 10;
        newY = Math.max(10, Math.min(screenHeight - baseHeight - 10, newY)); // Clamp Y to vertical bounds (using baseHeight for vertical positioning)
      } else if (closestEdge === 'right') {
        newX = screenWidth - baseWidth - 10; // Use baseWidth for X position when vertical
        newY = Math.max(10, Math.min(screenHeight - baseHeight - 10, newY)); // Clamp Y to vertical bounds (using baseHeight for vertical positioning)
      }
    } else {
      // If not snapping, keep current position and snappedTo state
      newX = position.x;
      newY = position.y;
      newSnappedTo = null; // No longer snapped
    }

    setPosition({ x: newX, y: newY });
    setSnappedTo(newSnappedTo);
  }, [position, baseWidth, baseHeight]); // Dependencies updated

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setOffset({
      x: clientX - position.x,
      y: clientY - position.y,
    });
    setSnappedTo(null); // Reset snapped state when dragging starts
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - offset.x,
      y: clientY - offset.y,
    });
  }, [isDragging, offset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    snapToEdge();
  }, [isDragging, snapToEdge]); // Added snapToEdge to dependencies

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove, { passive: false }); // Added passive: false for touch events
      document.addEventListener('touchend', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Determine rotation based on snappedTo state
  const rotationDegrees = (snappedTo === 'left') ? 90 :
                          (snappedTo === 'right') ? -90 : 0;

  return (
    <div
      ref={barRef}
      className={`absolute flex items-center justify-center p-3 rounded-3xl shadow-xl transition-all duration-300 ease-in-out transform
        ${isCurrentPlayer ? 'border-4 border-yellow-300/70 scale-105' : 'border border-gray-300/50'}
        ${player.color}/30 text-white cursor-grab active:cursor-grabbing z-50 backdrop-blur-sm
      `}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${baseWidth}px`, // Always use baseWidth
        height: `${baseHeight}px`, // Always use baseHeight
        transform: `rotate(${rotationDegrees}deg)`, // Apply rotation to the entire bar
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={(e) => handleMouseDown(e.touches[0])}
    >
      {/* Content inside the bar - will rotate with the parent */}
      <div className="flex items-center space-x-2">
        <span className="text-3xl">{player.emoji}</span>
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg text-white whitespace-nowrap">{player.name}</span>
          <span className="text-sm text-white whitespace-nowrap">턴: {player.turns}</span>
        </div>
      </div>
      {isCurrentPlayer && (
        <div className="ml-4 text-xl font-bold text-white whitespace-nowrap">
          {timer}s
        </div>
      )}
    </div>
  );
};

// EmojiPicker Component (Modal for emoji selection)
const EmojiPicker = ({ players, availableEmojis, selectedEmojis, onSelectEmoji, onStartGame, boardExtensionValue, setBoardExtensionValue, handleBoardExtension, currentBoardSize }) => {
  // Get all emojis that have been selected by any player
  const usedEmojis = Object.values(selectedEmojis);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white/40 p-6 rounded-3xl shadow-2xl max-w-lg w-full text-center max-h-[80vh] overflow-y-auto backdrop-blur-xl border border-white/50"> {/* Liquid Glass effect */}
        <h2 className="text-2xl font-bold mb-4 text-white">말 선택하기</h2>

        {players.map(player => (
          <div key={player.id} className="mb-4 pb-2 border-b border-gray-100/50 last:border-b-0">
            <h3 className="text-lg font-semibold mb-2 text-white">{player.name}</h3>
            <div className="flex flex-wrap justify-center gap-1.5"> {/* Adjusted gap */}
              {availableEmojis.map(emoji => {
                // Check if the emoji is already selected by another player
                const isEmojiUsed = usedEmojis.includes(emoji) && selectedEmojis[player.id] !== emoji;
                return (
                  <button
                    key={emoji}
                    className={`p-2 rounded-xl text-2xl transition-all duration-200 ease-in-out shadow-md
                      ${selectedEmojis[player.id] === emoji ? 'bg-blue-300/70 ring-4 ring-blue-500/70' : 'bg-gray-200/50 hover:bg-gray-300/70'}
                      ${isEmojiUsed ? 'opacity-50 cursor-not-allowed' : ''} /* Apply disabled style */
                      backdrop-blur-sm
                    `}
                    onClick={() => onSelectEmoji(player.id, emoji)}
                    disabled={isEmojiUsed} // Disable button if emoji is used
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            {selectedEmojis[player.id] && (
              <p className="mt-2 text-green-600 font-medium">{`선택됨: ${selectedEmojis[player.id]}`}</p>
            )}
          </div>
        ))}

        <div className="mt-4 pt-4 border-t border-gray-200/50">
          <h3 className="text-lg font-semibold mb-2 text-white">보드 크기 확장 (현재: {currentBoardSize}x{currentBoardSize})</h3>
          <div className="flex items-center justify-center gap-2 mb-4">
            <input
              type="number"
              value={boardExtensionValue}
              onChange={(e) => setBoardExtensionValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-24 p-2 border border-gray-300/50 rounded-xl text-center bg-white/50 backdrop-blur-sm text-white"
              min="0"
            />
            <button
              onClick={handleBoardExtension}
              className="px-4 py-2 bg-white/20 text-white font-semibold rounded-full shadow-lg hover:bg-white/30 transition duration-300 ease-in-out backdrop-blur-sm" // Liquid Glass style
            >
              확장
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4 text-white">현재 보드 크기에 추가 (예: 12 + 2 = 14x14)</p>
        </div>

        <button
          onClick={onStartGame}
          className="mt-4 px-8 py-4 bg-white/20 text-white font-bold text-xl rounded-full shadow-xl hover:bg-white/30 transition duration-300 ease-in-out transform hover:scale-105 backdrop-blur-sm" // Liquid Glass style
        >
          게임 시작
        </button>
      </div>
    </div>
  );
};

// GameOverModal Component
const GameOverModal = ({ winner, onResetGame }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white/40 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center backdrop-blur-xl border border-white/50"> {/* Liquid Glass effect */}
        <h2 className="text-3xl font-bold mb-4 text-white">게임 종료</h2>
        {winner && winner.name === '무승부' ? ( // Check winner for null before accessing name
          <p className="text-xl text-gray-700 mb-6 text-white">무승부</p>
        ) : (
          <>
            <p className="text-xl text-gray-700 mb-2 text-white">
              <span className="font-bold text-blue-600">{winner?.name}</span> 승리 {/* Use optional chaining */}
            </p>
            <p className="text-lg text-gray-600 mb-6 text-white">
              총 <span className="font-bold">{winner?.turns}</span> 턴 소요. {/* Use optional chaining */}
            </p>
          </>
        )}
        <button
          onClick={onResetGame}
          className="px-6 py-3 bg-white/20 text-white font-semibold rounded-full shadow-lg hover:bg-white/30 transition duration-300 ease-in-out transform hover:scale-105 backdrop-blur-sm" // Liquid Glass style
        >
          다시 플레이
        </button>
      </div>
    </div>
  );
};

// CustomAlertDialog Component
const CustomAlertDialog = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
      <div className="bg-white/40 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center backdrop-blur-xl border border-white/50"> {/* Liquid Glass effect */}
        <h2 className="text-2xl font-bold mb-4 text-white">알림</h2>
        <p className="text-lg text-gray-700 mb-6 text-white">{message}</p>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-white/20 text-white font-semibold rounded-full shadow-lg hover:bg-white/30 transition duration-300 ease-in-out transform hover:scale-105 backdrop-blur-sm" // Liquid Glass style
        >
          확인
        </button>
      </div>
    </div>
  );
};

// PauseMenu Component
const PauseMenu = ({ onContinue }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
      <div className="bg-white/40 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center backdrop-blur-xl border border-white/50"> {/* Liquid Glass effect */}
        <h2 className="text-3xl font-bold mb-4 text-white">일시정지</h2>
        <button
          onClick={onContinue}
          className="px-6 py-3 bg-white/20 text-white font-semibold rounded-full shadow-lg hover:bg-white/30 transition duration-300 ease-in-out transform hover:scale-105 backdrop-blur-sm" // Liquid Glass style
        >
          이어서 하기
        </button>
      </div>
    </div>
  );
};

export default App;