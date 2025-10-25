import React, { useState } from 'react';
import { Game, Player } from '../types';
// Fix: Import gameService to handle ending the game.
import { gameService } from '../services/gameService';

interface ScoringScreenProps {
  game: Game;
  currentPlayer: Player;
  onNextRound: () => void;
}

const ScoringScreen: React.FC<ScoringScreenProps> = ({ game, currentPlayer, onNextRound }) => {
  const [isConfirmingEndGame, setIsConfirmingEndGame] = useState(false);
  const scoresCalculated = !!game.lastRoundScores && Object.keys(game.lastRoundScores).length > 0;

  // When the round ends, all answers are submitted at once, so we go directly to AI validation.
  if (!scoresCalculated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl bg-gray-800 rounded-2xl shadow-lg p-8 text-center space-y-4">
            <h1 className="text-3xl font-black text-cyan-400">يقوم الذكاء الاصطناعي بالتحقق من الإجابات...</h1>
            <p className="text-xl text-gray-300">انتهت الجولة للجميع! انتظر قليلاً، يتم تقييم النتائج الآن.</p>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-400 mx-auto"></div>
        </div>
      </div>
    )
  }

  // All players have submitted and scores are in, show results.
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-6">
      <div className="w-full max-w-6xl bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-cyan-400">نتائج جولة <span className="text-yellow-400">"{game.currentLetter}"</span></h1>
          <p className="text-lg text-gray-400">الجولة {game.currentRound} / {game.totalRounds}</p>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
                <thead>
                    <tr className="border-b-2 border-gray-700">
                        <th className="p-3 text-lg font-bold">اللاعب</th>
                        {game.categories.map(cat => <th key={cat} className="p-3 text-lg font-bold">{cat}</th>)}
                        <th className="p-3 text-lg font-bold text-yellow-400">نقاط الجولة</th>
                        <th className="p-3 text-lg font-bold text-cyan-400">المجموع</th>
                    </tr>
                </thead>
                <tbody>
                    {game.players.map(player => (
                        <tr key={player.id} className="border-b border-gray-700 last:border-b-0">
                            <td className="p-3 font-bold text-lg">
                              <div className="flex items-center gap-3">
                                <img src={player.avatarUrl} alt={player.name} className="w-10 h-10 rounded-full object-cover bg-gray-600" />
                                <span>{player.name}</span>
                              </div>
                            </td>
                            {game.categories.map(category => {
                                const answer = game.roundData[player.id]?.[category] || '—';
                                const validationResult = game.roundValidation?.[player.id]?.[category];
                                
                                let cellStyle = 'p-3 transition-colors duration-300';
                                let icon = null;

                                if (answer !== '—' && validationResult) {
                                  if (validationResult.score === 10) {
                                    cellStyle += ' bg-green-500/20';
                                    icon = '⭐'; // Unique
                                  } else if (validationResult.score === 5) {
                                    cellStyle += ' bg-yellow-500/20';
                                    icon = '✅'; // Duplicate
                                  } else if (!validationResult.isValid) {
                                    cellStyle += ' bg-red-500/20';
                                    icon = '❌'; // Incorrect
                                  }
                                }

                                return (
                                  <td key={category} className={cellStyle}>
                                    <div className="flex items-center justify-end gap-2">
                                        <span>{answer}</span>
                                        {icon && <span>{icon}</span>}
                                    </div>
                                  </td>
                                );
                            })}
                            <td className="p-3 font-bold text-xl text-yellow-400 text-center">+{game.lastRoundScores?.[player.id] || 0}</td>
                            <td className="p-3 font-bold text-xl text-cyan-400 text-center">{player.score}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Scoring Rules Section */}
        <div className="mt-8 p-6 bg-gray-700/50 rounded-lg border border-gray-600">
          <h3 className="text-xl font-bold text-center text-cyan-300 mb-4">طريقة احتساب النقاط</h3>
          <div className="flex flex-col md:flex-row justify-around items-center gap-4 text-center">
              <div className="p-4 bg-gray-800 rounded-lg w-full md:w-1/3">
                  <p className="text-3xl font-black text-green-400">10 ⭐</p>
                  <p className="text-gray-300">إجابة صحيحة وفريدة</p>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg w-full md:w-1/3">
                  <p className="text-3xl font-black text-yellow-400">5 ✅</p>
                  <p className="text-gray-300">إجابة صحيحة ومكررة</p>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg w-full md:w-1/3">
                  <p className="text-3xl font-black text-red-400">0 ❌</p>
                  <p className="text-gray-300">إجابة خاطئة أو فارغة</p>
              </div>
          </div>
        </div>
        
        {/* Host Controls */}
        {currentPlayer.isHost && (
            <div className="mt-8 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-4">
                <button 
                    onClick={onNextRound} 
                    className="w-full sm:w-auto px-12 py-4 bg-green-600 hover:bg-green-700 rounded-lg text-2xl font-black tracking-wider uppercase transition transform hover:scale-105"
                >
                   {game.currentRound >= game.totalRounds ? 'عرض الفائز' : 'الجولة التالية'}
                </button>
                {game.currentRound < game.totalRounds &&
                    <button 
                        onClick={() => setIsConfirmingEndGame(true)} 
                        className="w-full sm:w-auto px-8 py-4 bg-red-700 hover:bg-red-800 rounded-lg text-xl font-bold tracking-wider uppercase transition transform hover:scale-105"
                        aria-label="إنهاء اللعبة وعرض الفائز"
                    >
                        إنهاء اللعبة
                    </button>
                }
            </div>
        )}
         {!currentPlayer.isHost && (
            <p className="text-center text-xl text-gray-400 mt-8">في انتظار المضيف لبدء الجولة التالية...</p>
        )}
      </div>
      
      {isConfirmingEndGame && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in-down">
          <div className="bg-gray-800 rounded-2xl shadow-lg p-8 space-y-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-yellow-400">هل أنت متأكد؟</h2>
            <p className="text-lg text-gray-300">
              سيؤدي هذا إلى إنهاء اللعبة فوراً لجميع اللاعبين وعرض الفائز بناءً على النقاط الحالية.
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <button 
                onClick={() => {
                  gameService.endGame();
                  setIsConfirmingEndGame(false);
                }}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-lg font-bold transition-transform transform hover:scale-105"
              >
                نعم، إنهاء اللعبة
              </button>
              <button 
                onClick={() => setIsConfirmingEndGame(false)}
                className="px-8 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg text-lg font-bold transition-transform transform hover:scale-105"
              >
                لا، استمر
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoringScreen;