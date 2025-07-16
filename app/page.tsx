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
  // New state for computer player
  const [isPlayer3Computer, setIsPlayer3Computer] = useState(false); // Player 3 as computer

  // Fixed background image URL as requested by the user
  const backgroundImage = 'https://512pixels.net/wp-content/uploads/2025/06/26-Tahoe-Light-6K-thumb.jpeg';

  // Ref for the timer interval
  const timerRef = useRef<NodeJS.Timeout | null>(null); // Explicitly type timerRef
  // Ref for computer player move timeout
  const computerMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Available emojis for selection
  const availableEmojis = [
    '😀', '😂', '🥳', '😎', '🤩', '🚀', '🍧', '🌈', '🍕', '�',
    '🍩', '🍦', '🍓', '🍎', '⚽', '🚗', '❤️', '🎲', '🧩', '🏆'
  ];

  // Initialize the board when boardSize changes or component mounts
  useEffect(() => {
    const initialBoard: (number | null)[][] = Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));
    setBoard(initialBoard);
  }, [boardSize]);

  // Function to get max consecutive pieces for a player at a given cell
  const getConsecutiveCount = useCallback((currentBoard: (number | null)[][], row: number, col: number, playerId: number): number => {
    const directions = [
      [0, 1],   // Horizontal
      [1, 0],   // Vertical
      [1, 1],   // Diagonal (top-left to bottom-right)
      [1, -1]   // Diagonal (top-right to bottom-left)
    ];

    let maxCount = 0;

    for (const [dr, dc] of directions) {
      let count = 1; // Start with the piece at (row, col) itself

      // Check in one direction
      for (let i = 1; i < boardSize; i++) {
        const r = row + i * dr;
        const c = col + i * dc;
        if (r >= 0 && r < boardSize && c >= 0 && c < boardSize && currentBoard[r][c] === playerId) {
          count++;
        } else {
          break;
        }
      }
      // Check in the opposite direction
      for (let i = 1; i < 5; i++) { // Changed to 5 to match win condition
        const r = row - i * dr;
        const c = col - i * dc;
        if (r >= 0 && r < boardSize && c >= 0 && c < boardSize && currentBoard[r][c] === playerId) {
          count++;
        } else {
          break;
        }
      }
      if (count > maxCount) {
        maxCount = count;
      }
    }
    return maxCount;
  }, [boardSize]);

  // Function to handle a cell click (placing a piece)
  const handleCellClick = useCallback((row: number, col: number) => {
    if (board[row][col] !== null || winner || !gameStarted || isPaused) {
      return;
    }

    const newBoard = board.map(arr => [...arr]);
    const currentPlayer = players[currentPlayerIndex];
    newBoard[row][col] = currentPlayer.id;

    setBoard(newBoard);

    setPlayers(prevPlayers => prevPlayers.map((p, index) =>
      index === currentPlayerIndex ? { ...p, turns: p.turns + 1 } : p
    ));

    // Check for win condition using the new getConsecutiveCount
    if (getConsecutiveCount(newBoard, row, col, currentPlayer.id) >= 5) {
      setWinner(currentPlayer);
      setGameStarted(false);
    } else {
      setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
    }
  }, [board, players, currentPlayerIndex, winner, gameStarted, isPaused, getConsecutiveCount]);

  // Function to handle a random move when timer runs out or as AI fallback
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
      handleCellClick(r, c);
    } else {
      setWinner({ id: -1, name: '무승부', emoji: '', turns: 0, color: '' });
      setGameStarted(false);
    }
  }, [board, boardSize, handleCellClick]);

  // AI logic for computer player
  const makeComputerMoveAI = useCallback(() => {
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c] === null) {
          emptyCells.push({ r, c });
        }
      }
    }

    if (emptyCells.length === 0) {
      setWinner({ id: -1, name: '무승부', emoji: '', turns: 0, color: '' });
      setGameStarted(false);
      return;
    }

    const computerPlayerId = players[currentPlayerIndex].id;
    const humanPlayerIds = players.filter(p => p.id !== computerPlayerId).map(p => p.id);

    // Helper to try a move and return true if successful
    const tryMove = (row: number, col: number): boolean => {
        if (board[row][col] === null) {
            handleCellClick(row, col);
            return true;
        }
        return false;
    };

    // 1. 컴퓨터의 승리 수 찾기 (5개 연속)
    for (const { r, c } of emptyCells) {
      const tempBoard = board.map(arr => [...arr]);
      tempBoard[r][c] = computerPlayerId;
      if (getConsecutiveCount(tempBoard, r, c, computerPlayerId) >= 5) {
        if (tryMove(r, c)) return;
      }
    }

    // 2. 인간 플레이어의 5개 연속 승리 방해
    for (const humanId of humanPlayerIds) {
      for (const { r, c } of emptyCells) {
        const tempBoard = board.map(arr => [...arr]);
        tempBoard[r][c] = humanId; // 인간 플레이어의 수를 시뮬레이션
        if (getConsecutiveCount(tempBoard, r, c, humanId) >= 5) {
          if (tryMove(r, c)) return; // 인간 플레이어의 승리 방해
        }
      }
    }

    // 3. 인간 플레이어의 4개 연속 위협 방해 (즉각적인 위협)
    for (const humanId of humanPlayerIds) {
      for (const { r, c } of emptyCells) {
        const tempBoard = board.map(arr => [...arr]);
        tempBoard[r][c] = humanId;
        if (getConsecutiveCount(tempBoard, r, c, humanId) >= 4) {
          if (tryMove(r, c)) return; // 4개 연속 방해
        }
      }
    }

    // 4. 컴퓨터의 4개 연속 기회 만들기
    for (const { r, c } of emptyCells) {
      const tempBoard = board.map(arr => [...arr]);
      tempBoard[r][c] = computerPlayerId;
      if (getConsecutiveCount(tempBoard, r, c, computerPlayerId) >= 4) {
        if (tryMove(r, c)) return; // 자신의 4개 연속 만들기
      }
    }

    // 5. 인간 플레이어의 3개 연속 위협 방해
    for (const humanId of humanPlayerIds) {
      for (const { r, c } of emptyCells) {
        const tempBoard = board.map(arr => [...arr]);
        tempBoard[r][c] = humanId;
        if (getConsecutiveCount(tempBoard, r, c, humanId) >= 3) {
          if (tryMove(r, c)) return; // 3개 연속 방해
        }
      }
    }

    // 6. 컴퓨터의 3개 연속 기회 만들기
    for (const { r, c } of emptyCells) {
      const tempBoard = board.map(arr => [...arr]);
      tempBoard[r][c] = computerPlayerId;
      if (getConsecutiveCount(tempBoard, r, c, computerPlayerId) >= 3) {
        if (tryMove(r, c)) return; // 자신의 3개 연속 만들기
      }
    }

    // 7. 전략적인 중앙 배치 (간단한 예시)
    // 보드 중앙에 가까운 빈 칸을 선호
    const center = Math.floor(boardSize / 2);
    const sortedEmptyCells = [...emptyCells].sort((a, b) => {
        const distA = Math.abs(a.r - center) + Math.abs(a.c - center);
        const distB = Math.abs(b.r - center) + Math.abs(b.c - center);
        return distA - distB;
    });

    for (const { r, c } of sortedEmptyCells) {
        if (tryMove(r, c)) return;
    }

    // 8. 모든 전략이 실패하면 무작위 수
    handleRandomMove();
  }, [board, boardSize, players, currentPlayerIndex, getConsecutiveCount, handleCellClick, handleRandomMove]);


  // Handle timer logic (for human players' timeout and general turn progression)
  useEffect(() => {
    if (!gameStarted || winner || isPaused) {
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
          clearInterval(timerRef.current!); // Use non-null assertion
          // If current player is computer, their move is handled by a separate useEffect.
          // This ensures human players still get a random move if they time out.
          if (!(players[currentPlayerIndex].id === 2 && isPlayer3Computer)) {
            handleRandomMove();
          }
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
  }, [currentPlayerIndex, gameStarted, boardSize, board, winner, isPaused, handleRandomMove, isPlayer3Computer, players]); // Removed makeComputerMoveAI from here

  // Effect for computer player's move with a delay
  useEffect(() => {
    if (gameStarted && !isPaused && winner === null && players[currentPlayerIndex].id === 2 && isPlayer3Computer) {
      // Clear any existing timeout to prevent multiple moves if state changes quickly
      if (computerMoveTimeoutRef.current) {
        clearTimeout(computerMoveTimeoutRef.current);
      }

      // Set a timeout for the computer's move (e.g., 2 seconds)
      computerMoveTimeoutRef.current = setTimeout(() => {
        makeComputerMoveAI();
      }, 2000); // Computer makes a move after 2 seconds
    }

    // Cleanup function: clear the timeout if the component unmounts or dependencies change
    return () => {
      if (computerMoveTimeoutRef.current) {
        clearTimeout(computerMoveTimeoutRef.current);
      }
    };
  }, [currentPlayerIndex, gameStarted, isPaused, winner, isPlayer3Computer, players, makeComputerMoveAI]);


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
    // Determine which players need manual emoji selection
    const playersNeedingSelection = players.filter(p => !(p.id === 2 && isPlayer3Computer));

    // Check if all *human* players have selected an emoji
    const allHumanPlayersSelected = playersNeedingSelection.every(p => selectedEmojis[p.id]);

    if (!allHumanPlayersSelected) {
      setAlertMessage('모든 플레이어는 말을 선택해야 합니다'); // Translated "All players must select an emoji!"
      return;
    }

    // Update player emojis and names based on computer player setting
    setPlayers(prevPlayers => prevPlayers.map(p => {
      if (p.id === 2 && isPlayer3Computer) {
        return { ...p, name: '컴퓨터', emoji: '🤖' }; // Set computer's name and emoji
      }
      return { ...p, emoji: selectedEmojis[p.id] || p.emoji }; // Use selected emoji or default
    }));

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
    // Reset players by mapping over the previous state to update properties,
    // instead of creating a brand new array literal. This preserves component identity.
    setPlayers(prevPlayers => prevPlayers.map(p => {
      if (p.id === 0) return { ...p, name: '플레이어 1', emoji: '🔴', turns: 0, color: 'bg-red-500' };
      if (p.id === 1) return { ...p, name: '플레이어 2', emoji: '🔵', turns: 0, color: 'bg-blue-500' };
      if (p.id === 2) return { ...p, name: '플레이어 3', emoji: '🟢', turns: 0, color: 'bg-green-500' };
      return p; // Fallback, though should not be reached with fixed IDs
    }));
    setIsPlayer3Computer(false); // Reset computer player setting
    setIsPaused(false); // Ensure game is not paused on reset
  };

  // Toggle pause state
  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  // Function to toggle fullscreen mode
  const toggleFullscreen = () => {
    // Attempt to go fullscreen. This might be disallowed by browser security policies
    // if not triggered directly by a user gesture or if in an iframe with restricted permissions.
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message} (${err.name})`);
        // You might want to show a user-friendly message here if fullscreen fails
        // e.g., setAlertMessage("전체화면 모드를 활성화할 수 없습니다. 브라우저 설정 또는 환경을 확인해주세요.");
      });
    } else {
      document.exitFullscreen();
    }
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

          /* Removed Custom keyframes for the dynamic border animation */
          /* Removed .computer-border-effect CSS rules */
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
            isPlayer3Computer={isPlayer3Computer} // Pass computer player state
            setIsPlayer3Computer={setIsPlayer3Computer} // Pass setter for computer player
            currentBoardSize={boardSize}
          />
        )}

        {/* Game Over Modal */}
        {winner && (
          <GameOverModal winner={winner} onResetGame={resetGame} />
        )}

        {/* Pause Menu */}
        {isPaused && <PauseMenu onContinue={() => setIsPaused(false)} onResetGame={resetGame} />}

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
              isPlayer3Computer={isPlayer3Computer} // Pass computer player state
            />
          ))}

          {/* Fullscreen Button (now in top-left) */}
          {gameStarted && (
            <button
              onClick={toggleFullscreen}
              className="absolute top-4 left-4 p-3 bg-white/20 text-white rounded-full shadow-lg hover:bg-white/30 transition duration-300 ease-in-out z-50 backdrop-blur-sm" // Liquid Glass style
              title="전체화면 전환"
            >
              <span className="text-xl">
                {document.fullscreenElement ? '축소' : '전체화면'} {/* Icon for exit/enter fullscreen */}
              </span>
            </button>
          )}

          {/* Pause Button (moved to top-right) */}
          {gameStarted && (
            <button
              onClick={togglePause}
              className="absolute top-4 right-4 p-3 bg-white/20 text-white rounded-full shadow-lg hover:bg-white/30 transition duration-300 ease-in-out z-50 backdrop-blur-sm" // Liquid Glass style
              title="게임 일시정지"
            >
              <span className="text-xl">⏸</span>
            </button>
          )}

          {/* Game Board */}
          {gameStarted && (
            <GameBoard
              board={board}
              boardSize={boardSize}
              onCellClick={handleCellClick}
              players={players}
              currentPlayerId={players[currentPlayerIndex].id} // Pass current player's ID
              isPlayer3Computer={isPlayer3Computer} // Pass computer player state
            />
          )}
        </div>
      </div>
    </>
  );
};

// GameBoard Component
interface GameBoardProps {
  board: (number | null)[][];
  boardSize: number;
  onCellClick: (row: number, col: number) => void;
  players: Player[];
  currentPlayerId: number; // New prop
  isPlayer3Computer: boolean; // New prop
}

const GameBoard = ({ board, boardSize, onCellClick, players, currentPlayerId, isPlayer3Computer }: GameBoardProps) => {
  const isCurrentPlayerComputer = isPlayer3Computer && currentPlayerId === 2; // Assuming player 3 is ID 2

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
            className={`w-full h-full bg-white/20 flex items-center justify-center rounded-lg transition duration-150 ease-in-out backdrop-blur-sm
              ${isCurrentPlayerComputer ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-white/40'} // Conditional cursor/hover
            `}
            onClick={() => {
              if (!isCurrentPlayerComputer) { // Only allow click if not computer's turn
                onCellClick(rowIndex, colIndex);
              }
            }}
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
interface PlayerInfoBarProps {
  player: Player;
  isCurrentPlayer: boolean;
  timer: number;
  totalPlayers: number;
  playerIndex: number;
  isPlayer3Computer: boolean; // New prop for computer player state
}

const PlayerInfoBar = ({ player, isCurrentPlayer, timer, totalPlayers, playerIndex, isPlayer3Computer }: PlayerInfoBarProps) => {
  const barRef = useRef<HTMLDivElement>(null);
  const snapOffset = 10; // Distance from edge to snap

  const baseWidth = 180;
  const baseHeight = 80;
  const halfWidth = baseWidth / 2;
  const halfHeight = baseHeight / 2;

  // Calculate initial position only once when the component mounts
  // This function is defined outside the component render to prevent re-creation on every render
  // and used with useState's lazy initialization.
  const getInitialPositionAndSnap = useCallback(() => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let initialX: number, initialY: number, initialSnappedTo: string | null;

    // Determine initial position based on playerIndex
    if (playerIndex === 0) { // Top-center (horizontal)
      initialX = screenWidth / 2 - halfWidth;
      initialY = snapOffset;
      initialSnappedTo = 'top';
    } else if (playerIndex === 1) { // Bottom-center (horizontal)
      initialX = screenWidth / 2 - halfWidth;
      initialY = screenHeight - baseHeight - snapOffset; // baseHeight
      initialSnappedTo = 'bottom';
    } else if (playerIndex === 2) { // Left-center (vertical)
      initialX = snapOffset + halfHeight - halfWidth; // Visual left edge at snapOffset
      initialY = screenHeight / 2 - halfWidth; // Center vertically
      initialSnappedTo = 'left';
    } else { // Fallback, e.g., for player 4 if re-added
      initialX = (screenWidth - snapOffset - baseHeight) - (halfWidth - halfHeight); // baseHeight
      initialY = screenHeight / 2 - halfWidth; // Effective height is baseWidth
      initialSnappedTo = 'right';
    }
    return { position: { x: initialX, y: initialY }, snappedTo: initialSnappedTo };
  }, [playerIndex, baseWidth, baseHeight, snapOffset, halfWidth, halfHeight]); // Dependencies for initial calculation

  // Use lazy initialization for position and snappedTo
  const [position, setPosition] = useState(() => getInitialPositionAndSnap().position);
  const [snappedTo, setSnappedTo] = useState(() => getInitialPositionAndSnap().snappedTo);

  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });


  // Function to snap the bar to the nearest edge (called after drag and on resize if snapped)
  const snapToEdge = useCallback(() => {
    const bar = barRef.current;
    if (!bar) return;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const snapThreshold = 50; // Pixels from edge to snap

    let currentX = position.x;
    let currentY = position.y;
    let newSnappedTo: string | null = null;

    const distances = {
      top: currentY,
      bottom: screenHeight - (currentY + baseHeight),
      left: currentX,
      right: screenWidth - (currentX + baseWidth)
    };

    let minDistance = Infinity;
    let closestEdge: string | null = null;

    for (const edge in distances) {
      if (distances[edge as keyof typeof distances] < minDistance) {
        minDistance = distances[edge as keyof typeof distances];
        closestEdge = edge;
      }
    }

    let finalX = currentX;
    let finalY = currentY;

    if (closestEdge && minDistance < snapThreshold) {
      newSnappedTo = closestEdge;

      if (closestEdge === 'top') {
        finalY = snapOffset;
        finalX = Math.max(snapOffset, Math.min(screenWidth - baseWidth - snapOffset, currentX));
      } else if (closestEdge === 'bottom') {
        finalY = screenHeight - baseHeight - snapOffset;
        finalX = Math.max(snapOffset, Math.min(screenWidth - baseWidth - snapOffset, currentX));
      } else if (closestEdge === 'left') {
        finalX = snapOffset + halfHeight - halfWidth;
        finalY = Math.max(snapOffset, Math.min(screenHeight - baseWidth - snapOffset, currentY));
      } else if (closestEdge === 'right') {
        finalX = (screenWidth - snapOffset - baseHeight) - (halfWidth - halfHeight);
        finalY = Math.max(snapOffset, Math.min(screenHeight - baseWidth - snapOffset, currentY));
      }
    } else {
      finalX = currentX;
      finalY = currentY;
      newSnappedTo = null;
    }

    setPosition({ x: finalX, y: finalY });
    setSnappedTo(newSnappedTo);
  }, [position, baseWidth, baseHeight, snapOffset, halfWidth, halfHeight]); // Dependencies for useCallback

  // Effect to handle window resize
  useEffect(() => {
    const handleResize = () => {
      // If the bar is currently snapped, re-snap it to adjust to new screen dimensions.
      if (snappedTo !== null) {
        snapToEdge();
      }
      // If not snapped, its absolute pixel position should remain fixed.
      // No need to re-calculate initial position if it was already set by dragging.
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [snappedTo, snapToEdge]); // Dependencies for useEffect

  const handleMouseDown = (coords: { clientX: number; clientY: number }) => {
    setIsDragging(true);
    setOffset({
      x: coords.clientX - position.x,
      y: coords.clientY - position.y,
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
  }, [isDragging, snapToEdge]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove, { passive: false });
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
                          (snappedTo === 'right') ? -90 :
                          (snappedTo === 'top') ? 180 :
                          0;

  // Determine if the current player is the active computer player
  const isActiveComputerPlayer = isCurrentPlayer && isPlayer3Computer && player.id === 2;

  return (
    <div
      ref={barRef}
      className={`absolute flex items-center justify-center p-3 rounded-3xl shadow-xl transition-all duration-300 ease-in-out transform
        ${isCurrentPlayer ? 'scale-105' : ''} /* Scale for current player */
        ${player.color}/30 text-white cursor-grab active:cursor-grabbing z-50 backdrop-blur-sm
        ${isCurrentPlayer ? 'border-4 border-yellow-300/70' : 'border-4 border-gray-300/50'} /* Always 4px border */
      `}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${baseWidth}px`, // Always use baseWidth
        height: `${baseHeight}px`, // Always use baseHeight
        transform: `rotate(${rotationDegrees}deg)`, // Apply rotation to the entire bar
        transformOrigin: '50% 50%', // Explicitly set transform origin
        willChange: 'transform', // Hint for browser optimization
      }}
      onMouseDown={(e) => handleMouseDown({ clientX: e.clientX, clientY: e.clientY })}
      onTouchStart={(e) => handleMouseDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY })}
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
interface EmojiPickerProps {
  players: Player[];
  availableEmojis: string[];
  selectedEmojis: { [key: number]: string };
  onSelectEmoji: (playerId: number, emoji: string) => void;
  onStartGame: () => void;
  boardExtensionValue: number;
  setBoardExtensionValue: React.Dispatch<React.SetStateAction<number>>;
  handleBoardExtension: () => void;
  isPlayer3Computer: boolean; // New prop for computer player state
  setIsPlayer3Computer: React.Dispatch<React.SetStateAction<boolean>>; // New prop for computer player setter
  currentBoardSize: number;
}

const EmojiPicker = ({ players, availableEmojis, selectedEmojis, onSelectEmoji, onStartGame, boardExtensionValue, setBoardExtensionValue, handleBoardExtension, isPlayer3Computer, setIsPlayer3Computer, currentBoardSize }: EmojiPickerProps) => {
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
                // Also disable emoji selection for computer player
                const isEmojiUsed = usedEmojis.includes(emoji) && selectedEmojis[player.id] !== emoji;
                const isDisabledForComputer = (player.id === 2 && isPlayer3Computer); // Disable if player 3 is computer

                return (
                  <button
                    key={emoji}
                    className={`p-2 rounded-xl text-2xl transition-all duration-200 ease-in-out shadow-md
                      ${selectedEmojis[player.id] === emoji ? 'bg-blue-300/70 ring-4 ring-blue-500/70' : 'bg-gray-200/50 hover:bg-gray-300/70'}
                      ${isEmojiUsed || isDisabledForComputer ? 'opacity-50 cursor-not-allowed' : ''} /* Apply disabled style */
                      backdrop-blur-sm
                    `}
                    onClick={() => onSelectEmoji(player.id, emoji)}
                    disabled={isEmojiUsed || isDisabledForComputer} // Disable button if emoji is used or if computer player
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            {selectedEmojis[player.id] && (
              // "선택됨" 텍스트 색상을 흰색으로 변경
              <p className="mt-2 text-white font-medium">{`선택됨: ${selectedEmojis[player.id]}`}</p>
            )}
            {/* Computer Player Toggle for Player 3 */}
            {player.id === 2 && (
              <div className="mt-4 flex items-center justify-center space-x-2">
                <span className="text-white font-semibold">컴퓨터 플레이어 활성화</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    value=""
                    className="sr-only peer"
                    checked={isPlayer3Computer}
                    onChange={(e) => setIsPlayer3Computer(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            )}
          </div>
        ))}

        {/* 보드 크기 확장 섹션의 상단 막대 제거 */}
        <div className="mt-4 pt-4">
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
    </div >
  );
};

// GameOverModal Component
interface GameOverModalProps {
  winner: Player | null;
  onResetGame: () => void;
}

const GameOverModal = ({ winner, onResetGame }: GameOverModalProps) => {
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
              총 <span className="font-bold">{winner?.turns}</span> 턴 소요됨 {/* Use optional chaining */}
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
interface CustomAlertDialogProps {
  message: string;
  onClose: () => void;
}

const CustomAlertDialog = ({ message, onClose }: CustomAlertDialogProps) => {
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
interface PauseMenuProps {
  onContinue: () => void;
  onResetGame: () => void; // Added onResetGame prop
}

const PauseMenu = ({ onContinue, onResetGame }: PauseMenuProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
      <div className="bg-white/40 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center backdrop-blur-xl border border-white/50"> {/* Liquid Glass effect */}
        <h2 className="text-3xl font-bold mb-4 text-white">일시정지</h2>
        <div className="flex justify-center space-x-4 mt-6"> {/* Container for buttons */}
          <button
            onClick={onContinue}
            className="px-6 py-3 bg-white/20 text-white font-semibold rounded-full shadow-lg hover:bg-white/30 transition duration-300 ease-in-out transform hover:scale-105 backdrop-blur-sm" // Liquid Glass style
          >
            이어서 하기
          </button>
          <button
            onClick={onResetGame} // Call resetGame on click
            className="px-6 py-3 bg-white/20 text-white font-semibold rounded-full shadow-lg hover:bg-white/30 transition duration-300 ease-in-out transform hover:scale-105 backdrop-blur-sm" // Liquid Glass style
          >
            다시 시작하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
