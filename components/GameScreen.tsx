import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player, PlayerAnswers } from '../types';
import { gameService } from '../services/gameService';

interface GameScreenProps {
  letter: string;
  categories: string[];
  players: Player[];
  currentPlayerId: string;
}

const Timer: React.FC<{ onTimeUp: () => void, roundKey: string }> = ({ onTimeUp, roundKey }) => {
    const [seconds, setSeconds] = useState(90);

    useEffect(() => {
        setSeconds(90); // Reset timer for new round
    }, [roundKey]);

    useEffect(() => {
        if (seconds === 0) {
            onTimeUp();
            return;
        }

        const timer = setInterval(() => {
            setSeconds(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [seconds, onTimeUp]);

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const progress = (seconds / 90) * 100;

    return (
        <div className="w-full">
            <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-cyan-300">الوقت المتبقي</span>
                <span className="text-sm font-medium text-cyan-300">{`${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4">
                <div className="bg-cyan-500 h-4 rounded-full transition-all duration-1000 linear" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
};

const GameScreen: React.FC<GameScreenProps> = ({ letter, categories, players, currentPlayerId }) => {
  const [answers, setAnswers] = useState<PlayerAnswers>(() => {
    return gameService.getDraftAnswers() || categories.reduce((acc, cat) => ({ ...acc, [cat]: '' }), {});
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  
  useEffect(() => {
    const initialAnswers = gameService.getDraftAnswers() || categories.reduce((acc, cat) => ({ ...acc, [cat]: '' }), {});
    setAnswers(initialAnswers);
    setIsSubmitting(false); 
  }, [letter, categories]);

  useEffect(() => {
    const handler = setTimeout(() => {
      gameService.saveDraftAnswers(answers);
    }, 500); // Debounce time

    return () => {
      clearTimeout(handler);
    };
  }, [answers]);

  const handleAnswerChange = (category: string, value: string) => {
    setAnswers(prev => ({ ...prev, [category]: value }));
  };

  const handleStop = useCallback(() => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    gameService.endRound(currentPlayerId, answersRef.current);
  }, [isSubmitting, currentPlayerId]);
  
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  const isStopDisabled = categories.some(category => !(answers[category] || '').trim());


  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-6 animate-fade-in-down relative">
        {isSubmitting && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex flex-col items-center justify-center z-50 animate-fade-in-down">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-400"></div>
              <h2 className="text-3xl font-bold text-white mt-4">تم إيقاف اللعبة!</h2>
              <p className="text-xl text-gray-300">جاري إرسال إجاباتك...</p>
            </div>
        )}

        <div className="w-full max-w-4xl space-y-4">
            <div className="bg-gray-800 rounded-2xl shadow-lg p-4">
                <h2 className="text-xl font-bold text-center text-gray-400 mb-3">النقاط الحالية</h2>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
                    {sortedPlayers.map(player => (
                        <div key={player.id} className="flex items-center gap-2 bg-gray-700/50 rounded-full pr-3 py-1">
                            <img src={player.avatarUrl} alt={player.name} className="w-8 h-8 rounded-full object-cover bg-gray-600" />
                            <p className="font-bold text-white truncate">{player.name}</p>
                            <p className="text-xl font-black text-yellow-400">{player.score}</p>
                        </div>
                    ))}
                </div>
            </div>
        
            <div className="bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <p className="text-2xl text-gray-400">الحرف هو</p>
                        <h1 key={letter} className="text-9xl font-black text-cyan-400 animate-fade-in-scale-up">{letter}</h1>
                    </div>
                    <div className="w-full md:w-1/2">
                       <Timer onTimeUp={handleStop} roundKey={letter} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map(category => (
                    <div key={category}>
                      <label className="text-lg font-bold text-gray-300 mb-1 block">{category}</label>
                      <input
                        type="text"
                        value={answers[category] || ''}
                        onChange={(e) => handleAnswerChange(category, e.target.value)}
                        className="w-full bg-gray-700 text-white rounded-md p-3 border-2 border-gray-600 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:scale-105 transition-transform duration-200"
                        aria-label={`إجابة لـ ${category}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-4 text-center">
                  <button 
                    onClick={handleStop} 
                    disabled={isStopDisabled || isSubmitting}
                    className="w-full md:w-2/3 lg:w-1/2 mx-auto bg-red-600 hover:bg-red-700 p-4 rounded-lg text-2xl font-black tracking-wider uppercase transition transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed"
                  >
                      {isSubmitting ? 'جاري الإرسال...' : 'ستوب!'}
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    {isStopDisabled ? 'يجب ملء جميع الفئات لتتمكن من الضغط على "ستوب".' : 'اضغط "ستوب" عندما تنهي جميع الفئات أو عند انتهاء الوقت.'}
                  </p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default GameScreen;