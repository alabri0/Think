import React, { useState } from 'react';
import { Game, Player } from '../types';
import { CORE_CATEGORIES, OPTIONAL_CATEGORIES } from '../constants';
import { gameService } from '../services/gameService';
import AvatarUpload from './AvatarUpload';

interface LobbyScreenProps {
  game: Game;
  currentPlayer: Player;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({ game, currentPlayer }) => {
  // Only the host can change settings, so local state is fine.
  const [rounds, setRounds] = useState(game.totalRounds);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(game.categories);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const handleCategoryToggle = (category: string) => {
    if (!currentPlayer.isHost) return;
    const newCategories = selectedCategories.includes(category)
        ? selectedCategories.filter(c => c !== category)
        : [...selectedCategories, category];
    setSelectedCategories(newCategories);
    gameService.updateSettings({ categories: newCategories });
  };
  
  const handleRoundsChange = (newRounds: number) => {
     if (!currentPlayer.isHost) return;
     const r = Math.max(1, Math.min(20, newRounds));
     setRounds(r);
     gameService.updateSettings({ rounds: r });
  }

  const handleStartGame = () => {
    if (game.players.length > 0) {
      gameService.startGame();
    } else {
      alert('يجب أن يكون هناك لاعب واحد على الأقل لبدء اللعبة.');
    }
  };

  const handleLeaveGame = () => {
    // Ends the session and returns to the home screen without confirmation.
    gameService.leaveGame();
  };

  const handleAvatarSelected = (dataUrl: string) => {
    gameService.updatePlayerAvatar(dataUrl);
    setIsAvatarModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-gray-800 rounded-2xl shadow-lg p-8 space-y-6 relative">
        <button 
          onClick={handleLeaveGame} 
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700"
          aria-label="مغادرة الغرفة"
          title="مغادرة الغرفة"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
        
        <h1 className="text-4xl font-black text-center text-cyan-400">غرفة الانتظار</h1>
        <div className="text-center bg-gray-700 p-4 rounded-lg">
            <p className="text-lg text-gray-300">شارك هذا الرمز مع أصدقائك لينضموا!</p>
            <p className="text-5xl font-mono font-bold text-yellow-400 tracking-widest my-2">{game.gameCode}</p>
        </div>
        
        {/* Players List */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold">اللاعبون المنضمون ({game.players.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {game.players.map((player) => {
              const isCurrentUser = player.id === currentPlayer.id;
              return (
                <div key={player.id} className="bg-gray-700 p-3 rounded-lg flex items-center gap-3">
                  <div className="relative">
                    {isCurrentUser ? (
                      <button 
                        onClick={() => setIsAvatarModalOpen(true)}
                        className="rounded-full w-12 h-12 block bg-gray-600 hover:opacity-80 transition-opacity"
                        aria-label="تغيير الصورة الرمزية"
                      >
                        <img 
                            src={player.avatarUrl} 
                            alt={player.name}
                            className="w-full h-full rounded-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full opacity-0 hover:opacity-100 transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                        </div>
                      </button>
                    ) : (
                      <img 
                        src={player.avatarUrl} 
                        alt={player.name}
                        className="w-12 h-12 rounded-full object-cover bg-gray-600"
                      />
                    )}
                    {player.isHost && (
                      <span className="absolute -top-1 -right-1 text-2xl" title="المضيف">👑</span>
                    )}
                  </div>
                  <span className="font-bold text-lg truncate">{player.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Categories (Host only) */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">الفئات</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...CORE_CATEGORIES, ...OPTIONAL_CATEGORIES].map(cat => (
              <button key={cat} onClick={() => handleCategoryToggle(cat)} disabled={!currentPlayer.isHost} className={`p-3 rounded-lg text-center font-bold transition-colors ${selectedCategories.includes(cat) ? 'bg-cyan-600 text-white ring-2 ring-cyan-400' : 'bg-gray-700 text-gray-300'} ${!currentPlayer.isHost ? 'cursor-not-allowed' : 'hover:bg-cyan-700'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        {/* Rounds (Host only) */}
        <div className="space-y-3">
            <h2 className="text-2xl font-bold">عدد الجولات</h2>
            <div className="flex items-center justify-center gap-4 bg-gray-700 p-3 rounded-lg">
                <button onClick={() => handleRoundsChange(rounds - 1)} disabled={!currentPlayer.isHost || rounds <= 1} className="w-12 h-12 bg-gray-600 rounded-full text-3xl font-bold disabled:opacity-50">-</button>
                <span className="text-4xl font-bold w-16 text-center">{rounds}</span>
                <button onClick={() => handleRoundsChange(rounds + 1)} disabled={!currentPlayer.isHost || rounds >= 20} className="w-12 h-12 bg-gray-600 rounded-full text-3xl font-bold disabled:opacity-50">+</button>
            </div>
        </div>

        {/* Start Game (Host only) */}
        {currentPlayer.isHost && (
          <div className="pt-4">
            <button onClick={handleStartGame} className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-lg text-2xl font-black tracking-wider uppercase transition transform hover:scale-105">
              ابدأ اللعبة
            </button>
          </div>
        )}
        {!currentPlayer.isHost && (
            <p className="text-center text-xl text-gray-400 pt-4">في انتظار المضيف لبدء اللعبة...</p>
        )}
      </div>
      <AvatarUpload 
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onAvatarSelect={handleAvatarSelected}
      />
    </div>
  );
};

export default LobbyScreen;
