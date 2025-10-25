import React from 'react';
import { Player } from '../types';

interface WinnerScreenProps {
  players: Player[];
  isHost: boolean;
  onPlayAgain: () => void;
}

const WinnerScreen: React.FC<WinnerScreenProps> = ({ players, isHost, onPlayAgain }) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 text-center">
      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl shadow-lg p-8 space-y-8 animate-fade-in-down">
        <h1 className="text-5xl font-black text-yellow-400">🎉 الفائز هو... 🎉</h1>
        <div className="flex flex-col items-center">
          <div className="relative">
            <img src={winner.avatarUrl} alt={winner.name} className="w-32 h-32 rounded-full object-cover bg-yellow-500 border-4 border-yellow-400" />
            <div className="absolute -top-2 -right-2 text-5xl">👑</div>
          </div>
          <h2 className="text-6xl font-black text-white mt-4">{winner.name}</h2>
          <p className="text-3xl text-yellow-400 font-bold">{winner.score} نقطة</p>
        </div>
        
        <div className="space-y-4">
            <h3 className="text-2xl font-bold">الترتيب النهائي</h3>
            <ul className="space-y-2">
                {sortedPlayers.map((player, index) => (
                    <li key={player.id} className={`p-3 rounded-lg flex justify-between items-center text-lg ${index === 0 ? 'bg-yellow-600' : 'bg-gray-700'}`}>
                        <div className="flex items-center gap-3">
                            <span className="font-bold w-6 text-center">{index + 1}.</span>
                            <img src={player.avatarUrl} alt={player.name} className="w-10 h-10 rounded-full object-cover bg-gray-600" />
                            <span className="font-bold">{player.name}</span>
                        </div>
                        <span className="font-semibold">{player.score} نقطة</span>
                    </li>
                ))}
            </ul>
        </div>
        
        {isHost && (
            <button 
              onClick={onPlayAgain} 
              className="w-full bg-cyan-600 hover:bg-cyan-700 p-4 rounded-lg text-2xl font-black tracking-wider uppercase transition transform hover:scale-105"
            >
              العب مجدداً
            </button>
        )}
        {!isHost && (
             <p className="text-xl text-gray-300">في انتظار المضيف لبدء لعبة جديدة...</p>
        )}
      </div>
    </div>
  );
};

export default WinnerScreen;