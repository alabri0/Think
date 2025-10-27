import React, { useState, useEffect, useMemo } from 'react';
import { ARABIC_LETTERS } from '../constants';

interface LetterSpinnerProps {
  onSpinEnd: (letter: string) => void;
  usedLetters: string[];
  isHost: boolean;
}

const LetterSpinner: React.FC<LetterSpinnerProps> = ({ onSpinEnd, usedLetters, isHost }) => {
  const [spinning, setSpinning] = useState(false);
  const [spinCompleted, setSpinCompleted] = useState(false);
  const [displayedLetter, setDisplayedLetter] = useState('؟');

  const availableLetters = useMemo(() => ARABIC_LETTERS.filter(l => !usedLetters.includes(l)), [usedLetters]);

  useEffect(() => {
    if (!spinning || availableLetters.length === 0) return;

    let spinCount = 0;
    const maxSpins = 30 + Math.floor(Math.random() * 10); // Random duration
    
    const chosenLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)];

    const spinInterval = setInterval(() => {
      spinCount++;
      const randomLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
      setDisplayedLetter(randomLetter);

      if (spinCount >= maxSpins) {
        clearInterval(spinInterval);
        setDisplayedLetter(chosenLetter);
        setSpinning(false);
        setSpinCompleted(true);
        setTimeout(() => onSpinEnd(chosenLetter), 1000); 
      }
    }, 100);

    return () => clearInterval(spinInterval);
  }, [spinning, availableLetters, onSpinEnd]);

  const handleSpin = () => {
    if (isHost && availableLetters.length > 0 && !spinning && !spinCompleted) {
      setSpinning(true);
    } else if (availableLetters.length === 0) {
        alert("انتهت كل الحروف!");
    }
  };
  
  if (availableLetters.length === 0) {
     return (
        <div className="flex flex-col items-center justify-center text-center p-8 space-y-6">
            <h2 className="text-4xl font-bold text-yellow-400">انتهت كل الحروف!</h2>
            <p className="text-xl text-gray-300">لقد لعبتم بكل الحروف المتاحة.</p>
        </div>
     )
  }

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 space-y-6">
      <h2 className="text-4xl font-bold text-cyan-300">المضيف يختار الحرف...</h2>
      <p className="text-xl text-gray-300">{isHost ? 'اضغط على الزر لاختيار حرف عشوائي.' : 'انتظر من المضيف أن يبدأ.'}</p>
      <div className="w-48 h-48 sm:w-64 sm:h-64 bg-gray-700 rounded-full flex items-center justify-center border-8 border-cyan-500 shadow-lg">
        <span className="text-8xl sm:text-9xl font-black text-white transition-all duration-100">{displayedLetter}</span>
      </div>
      {isHost && (
        <button
          onClick={handleSpin}
          disabled={spinning || spinCompleted}
          className="px-12 py-4 bg-green-600 hover:bg-green-700 rounded-lg text-2xl font-bold tracking-wider uppercase transition transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {spinning ? '...جاري الدوران' : (spinCompleted ? 'تم اختيار الحرف' : 'اختر حرف')}
        </button>
      )}
    </div>
  );
};

export default LetterSpinner;