import React, { useState, useEffect, useMemo } from 'react';
import { GameState, Game, Player } from './types';
import { gameService } from './services/gameService';
import HomeScreen from './components/HomeScreen';
import LobbyScreen from './components/SetupScreen';
import LetterSpinner from './components/LetterSpinner';
import GameScreen from './components/GameScreen';
import ScoringScreen from './components/ScoringScreen';
import WinnerScreen from './components/WinnerScreen';

const App: React.FC = () => {
  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const handleGameUpdate = (newGame: Game | null) => {
      setGame(newGame);
      setCurrentPlayerId(gameService.getCurrentPlayerId());
    };
    
    gameService.subscribe(handleGameUpdate);
    
    // Initial sync
    handleGameUpdate(gameService.getGame());

    return () => {
      gameService.unsubscribe(handleGameUpdate);
    };
  }, []);

  const currentPlayer = useMemo(() => {
    if (!game || !currentPlayerId) return null;
    return game.players.find(p => p.id === currentPlayerId);
  }, [game, currentPlayerId]);

  const renderGameState = () => {
    if (!game || !currentPlayer) {
      return <HomeScreen />;
    }

    switch (game.gameState) {
      case GameState.LOBBY:
        return <LobbyScreen game={game} currentPlayer={currentPlayer} />;
      case GameState.SPINNING:
        return (
          <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-gray-800 rounded-2xl shadow-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">الجولة <span className="text-cyan-400">{game.currentRound}</span> / {game.totalRounds}</h2>
                <div className="text-right">
                  {game.players.sort((a,b) => b.score - a.score).map(p => <div key={p.id} className="text-lg"><span className="font-bold">{p.name}:</span> <span className="text-yellow-400">{p.score}</span></div>)}
                </div>
              </div>
              <LetterSpinner
                usedLetters={game.usedLetters}
                onSpinEnd={(letter) => gameService.chooseLetter(letter)}
                isHost={currentPlayer.isHost}
              />
            </div>
          </div>
        );
      case GameState.PLAYING:
        return <GameScreen 
                  letter={game.currentLetter} 
                  categories={game.categories} 
                  players={game.players}
                  onRoundEnd={(answers) => gameService.endRound(currentPlayer.id, answers)}
                />;
      case GameState.SCORING:
        return <ScoringScreen 
                  game={game} 
                  currentPlayer={currentPlayer}
                  onNextRound={() => gameService.nextRound()}
                />;
      case GameState.WINNER:
        return <WinnerScreen 
                  players={game.players} 
                  isHost={currentPlayer.isHost}
                  onPlayAgain={() => gameService.playAgain()}
                />;
      default:
        return <HomeScreen />;
    }
  };

  return <div className="bg-gray-900">{renderGameState()}</div>;
};

export default App;