import React, { useState } from 'react';
import { Game, Player } from '../types';
import { CORE_CATEGORIES, OPTIONAL_CATEGORIES } from '../constants';
import { gameService } from '../services/gameService';
import AvatarUpload from './AvatarUpload';

// A map of category names to their corresponding SVG icons for visual representation.
const categoryIcons: { [key: string]: React.ReactNode } = {
  'نبات': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M8 14h6M9 11v-1a2 2 0 012-2h2a2 2 0 012 2v1m-6 0h6" />
    </svg>
  ),
  'حيوان': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
       <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  ),
  'جماد': (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  'بلاد': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  'اسم': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  'أكل/شرب': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0c-.454-.303-.977-.454-1.5-.454V8.546c.523 0 1.046-.151 1.5-.454a2.704 2.704 0 013 0 2.704 2.704 0 003 0 2.704 2.704 0 013 0 2.704 2.704 0 003 0c.454.303.977.454 1.5.454v7zM4 6h16" />
    </svg>
  ),
  'مهنة': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  'صفة': (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
};

interface LobbyScreenProps {
  game: Game;
  currentPlayer: Player;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({ game, currentPlayer }) => {
  // Only the host can change settings, so local state is fine.
  const [rounds, setRounds] = useState(game.totalRounds);
  const [roundDuration, setRoundDuration] = useState(game.roundDuration);
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

  const handleDurationChange = (newDuration: number) => {
    if (!currentPlayer.isHost) return;
    setRoundDuration(newDuration);
    gameService.updateSettings({ roundDuration: newDuration });
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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 animate-fade-in-down">
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
        
        <div className="text-center">
          <h1 className="text-4xl font-black text-cyan-400">غرفة الانتظار</h1>
          <p className="text-lg text-gray-400">رمز الانضمام: 
            <span 
              onClick={() => navigator.clipboard.writeText(game.gameCode)}
              className="font-mono text-2xl text-yellow-400 bg-gray-700 p-2 rounded-md cursor-pointer hover:bg-gray-600 transition-colors"
              title="نسخ الرمز"
            >
              {game.gameCode}
            </span>
          </p>
        </div>

        <div className="bg-gray-700/50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-center mb-6 text-cyan-300">اللاعبون ({game.players.length})</h2>
          <div className="flex flex-wrap justify-center items-start gap-x-6 gap-y-8">
            {game.players.map(player => (
              <div key={player.id} className="flex flex-col items-center text-center w-32 group">
                <div className="relative">
                    <img 
                      src={player.avatarUrl} 
                      alt={player.name} 
                      className={`w-28 h-28 rounded-full object-cover bg-gray-600 border-4 transition-transform duration-300 group-hover:scale-105 ${player.isHost ? 'border-yellow-400 shadow-lg shadow-yellow-400/20' : 'border-gray-500'}`} 
                    />
                    
                    {player.id === currentPlayer.id && (
                        <button 
                            onClick={() => setIsAvatarModalOpen(true)}
                            className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-60 flex items-center justify-center rounded-full transition-opacity opacity-0 hover:opacity-100"
                            aria-label="تغيير الصورة الرمزية"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                           </svg>
                        </button>
                    )}
                </div>
                 <div className="mt-2 flex flex-col items-center justify-start h-16">
                    {player.isHost && (
                      <div className="mb-1 bg-yellow-400 text-gray-900 px-3 py-0.5 rounded-full text-sm font-bold shadow-md">
                        المضيف
                      </div>
                    )}
                    <p className={`font-bold truncate w-32 pt-1 ${player.id === currentPlayer.id ? 'text-cyan-300' : ''}`} title={player.name}>
                      {player.name}
                    </p>
                  </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-gray-700/50 p-4 rounded-lg space-y-4">
            <h2 className="text-2xl font-bold text-center text-cyan-300 mb-4">إعدادات اللعبة {currentPlayer.isHost ? '' : '(للمضيف فقط)'}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 items-center">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <label className="text-xl font-bold whitespace-nowrap">عدد الجولات:</label>
                    <div className="flex items-center gap-3">
                        <button onClick={() => handleRoundsChange(rounds - 1)} disabled={!currentPlayer.isHost} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed font-black text-2xl">-</button>
                        <span className="text-3xl font-black w-12 text-center">{rounds}</span>
                        <button onClick={() => handleRoundsChange(rounds + 1)} disabled={!currentPlayer.isHost} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed font-black text-2xl">+</button>
                    </div>
                </div>
                 <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <label className="text-xl font-bold whitespace-nowrap">وقت الجولة:</label>
                    <div className="flex items-center gap-2">
                         {[60, 90, 120, 180].map(time => (
                             <button 
                                 key={time}
                                 onClick={() => handleDurationChange(time)} 
                                 disabled={!currentPlayer.isHost} 
                                 className={`px-3 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg
                                     ${roundDuration === time ? 'bg-cyan-500 text-white shadow-lg' : 'bg-gray-600 hover:bg-gray-500'}`
                                 }
                             >
                                 {time} ث
                             </button>
                         ))}
                    </div>
                </div>
            </div>
            
            <div className="pt-2">
              <label className="text-xl font-bold text-center block mb-3">الفئات:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[...CORE_CATEGORIES, ...OPTIONAL_CATEGORIES].map(category => {
                      const isSelected = selectedCategories.includes(category);
                      const isCore = CORE_CATEGORIES.includes(category);
                      return (
                          <button
                              key={category}
                              onClick={() => handleCategoryToggle(category)}
                              disabled={isCore || !currentPlayer.isHost}
                              className={`p-4 rounded-lg text-center font-bold transition-all duration-300 transform flex flex-col items-center justify-center gap-2
                              ${isCore ? 'bg-cyan-700/80 cursor-not-allowed' : 
                                  (isSelected ? 'bg-green-600 hover:bg-green-700 ring-2 ring-white scale-105' : 'bg-gray-700 hover:bg-gray-600 hover:scale-105')}
                              ${!currentPlayer.isHost && !isCore ? 'opacity-70 cursor-not-allowed' : ''}
                              `}
                          >
                              {categoryIcons[category]}
                              <span>{category}</span>
                          </button>
                      )
                  })}
              </div>
            </div>
        </div>

        {currentPlayer.isHost && (
          <button 
            onClick={handleStartGame} 
            className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-lg text-2xl font-black tracking-wider uppercase transition transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed"
            disabled={game.players.length === 0}
          >
            ابدأ اللعبة
          </button>
        )}
        {!currentPlayer.isHost && (
            <p className="text-center text-xl text-gray-400">في انتظار المضيف لبدء اللعبة...</p>
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