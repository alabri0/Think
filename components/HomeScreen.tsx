import React, { useState } from 'react';
import { gameService } from '../services/gameService';

const HomeScreen: React.FC = () => {
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleCreate = () => {
    if (playerName.trim()) {
      gameService.createGame(playerName.trim());
    } else {
      alert('الرجاء إدخال اسمك!');
    }
  };

  const handleJoin = () => {
    if (playerName.trim() && gameCode.trim()) {
      gameService.joinGame(gameCode.trim().toUpperCase(), playerName.trim());
    } else {
      alert('الرجاء إدخال اسمك ورمز اللعبة!');
    }
  };
  
  const handleLeave = () => {
      gameService.leaveGame();
  }
  
  // In case user refreshes and is stuck in a game
  if (gameService.getGame()) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 text-center">
            <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-lg p-8 space-y-6">
                 <h1 className="text-3xl font-bold text-cyan-400">أنت بالفعل في لعبة!</h1>
                 <p className="text-lg text-gray-300">هل تريد العودة للعبة أم مغادرتها؟</p>
                 <button onClick={() => window.location.reload()} className="w-full p-3 bg-green-600 hover:bg-green-700 rounded-lg text-lg font-bold">العودة للعبة</button>
                 <button onClick={handleLeave} className="w-full p-3 bg-red-600 hover:bg-red-700 rounded-lg text-lg font-bold">مغادرة والبدء من جديد</button>
            </div>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-5xl font-black text-cyan-400">نبات، حيوان، جماد</h1>
          <p className="text-xl text-gray-300 mt-2">لعبة جماعية سريعة وممتعة</p>
        </div>
        
        <input
          type="text"
          placeholder="أدخل اسمك هنا..."
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full bg-gray-700 text-white text-center rounded-lg p-4 text-xl border-2 border-transparent focus:border-cyan-500 focus:outline-none transition"
        />

        {isJoining ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="أدخل رمز اللعبة"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value)}
              maxLength={5}
              className="w-full bg-gray-700 text-white text-center rounded-lg p-4 text-2xl font-mono tracking-widest border-2 border-transparent focus:border-yellow-400 focus:outline-none transition"
              style={{textTransform: 'uppercase'}}
            />
            <button onClick={handleJoin} className="w-full p-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-xl font-bold">
              انضم الآن
            </button>
            <button onClick={() => setIsJoining(false)} className="w-full text-gray-400 hover:text-white transition">
              العودة
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <button onClick={handleCreate} className="p-4 bg-green-600 hover:bg-green-700 rounded-lg text-xl font-bold">
              ✨ إنشاء لعبة جديدة
            </button>
            <button onClick={() => setIsJoining(true)} className="p-4 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-xl font-bold">
              ➡️ الانضمام للعبة
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeScreen;