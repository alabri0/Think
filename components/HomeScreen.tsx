
import React, { useState } from 'react';
import { gameService } from '../services/gameService';
import { soundService } from '../services/soundService';

const HomeScreen: React.FC = () => {
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  const handleCreate = async () => {
    if (!playerName.trim()) {
      setError('الرجاء إدخال اسمك!');
      return;
    }
    setError('');
    setIsLoading(true);
    soundService.init(); // Initialize audio on user action
    try {
      await gameService.createGame(playerName.trim());
    } catch (e: any) {
      setError(e.message || 'فشل في إنشاء اللعبة.');
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!playerName.trim() || !gameCode.trim()) {
      setError('الرجاء إدخال اسمك ورمز اللعبة!');
      return;
    }
    setError('');
    setIsLoading(true);
    soundService.init(); // Initialize audio on user action
    try {
      await gameService.joinGame(gameCode.trim().toUpperCase(), playerName.trim());
    } catch (e: any) {
      setError(e.message || 'فشل في الانضمام للعبة.');
      setIsLoading(false);
    }
  };
  
  const handleLeave = () => {
      gameService.leaveGame();
  }
  
  // This screen might show briefly if a user refreshes while in a game,
  // before the main App component syncs state.
  // The main logic for handling existing game sessions is now in App.tsx
  if (gameService.getGame()) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 text-center">
            <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-lg p-8 space-y-6">
                 <h1 className="text-3xl font-bold text-cyan-400">إعادة الاتصال...</h1>
                 <p className="text-lg text-gray-300">أنت بالفعل في لعبة. جاري محاولة إعادة الاتصال...</p>
                 <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-cyan-400 mx-auto"></div>
            </div>
        </div>
      )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-5xl font-black text-cyan-400">نبات، حيوان، جماد</h1>
            <p className="text-xl text-gray-300 mt-2">لعبة جماعية سريعة وممتعة</p>
          </div>
          
          {error && <p className="text-red-500 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
          
          <input
            type="text"
            placeholder="أدخل اسمك هنا..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full bg-gray-700 text-white text-center rounded-lg p-4 text-xl border-2 border-transparent focus:border-cyan-500 focus:outline-none transition"
            disabled={isLoading}
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
                disabled={isLoading}
              />
              <button onClick={handleJoin} disabled={isLoading} className="w-full p-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-xl font-bold disabled:bg-gray-500 disabled:cursor-wait">
                {isLoading ? '...جاري الانضمام' : 'انضم الآن'}
              </button>
              <button onClick={() => setIsJoining(false)} disabled={isLoading} className="w-full text-gray-400 hover:text-white transition disabled:opacity-50">
                العودة
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <button onClick={handleCreate} disabled={isLoading} className="p-4 bg-green-600 hover:bg-green-700 rounded-lg text-xl font-bold disabled:bg-gray-500 disabled:cursor-wait">
                {isLoading ? '...جاري الإنشاء' : '✨ إنشاء لعبة جديدة'}
              </button>
              <button onClick={() => setIsJoining(true)} disabled={isLoading} className="p-4 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-xl font-bold disabled:opacity-50">
                ➡️ الانضمام للعبة
              </button>
            </div>
          )}

          <div className="text-center pt-4 border-t border-gray-700/50">
            <button 
                onClick={() => setIsAboutModalOpen(true)}
                className="text-cyan-400 hover:text-cyan-300 transition-colors underline"
            >
                حول اللعبة
            </button>
          </div>
        </div>
      </div>

      {isAboutModalOpen && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in-down"
            onClick={() => setIsAboutModalOpen(false)}
        >
            <div 
                className="bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 w-full max-w-2xl text-right space-y-6 max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-3xl font-black text-center text-cyan-400">حول اللعبة</h2>
                
                <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-yellow-400 border-b-2 border-yellow-400/30 pb-2">✨ مميزات اللعبة</h3>
                    <ul className="list-disc list-inside space-y-2 pr-4 text-lg text-gray-300">
                        <li>لعبة جماعية ممتعة تتحدى السرعة والمعرفة.</li>
                        <li>تقييم ذكي وتلقائي للإجابات باستخدام الذكاء الاصطناعي.</li>
                        <li>تخصيص كامل لإعدادات اللعبة (عدد الجولات، الفئات، وقت الجولة).</li>
                        <li>واجهة عصرية وسهلة الاستخدام.</li>
                        <li>إمكانية تعديل النتائج يدويًا بواسطة المضيف.</li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-yellow-400 border-b-2 border-yellow-400/30 pb-2">🎮 كيف تلعب</h3>
                    <ol className="list-decimal list-inside space-y-2 pr-4 text-lg text-gray-300">
                        <li>أنشئ لعبة وشارك الرمز مع أصدقائك للانضمام.</li>
                        <li>يقوم المضيف باختيار حرف عشوائي لبدء الجولة.</li>
                        <li>حاول ملء جميع الفئات بكلمات تبدأ بالحرف المختار قبل انتهاء الوقت.</li>
                        <li>اضغط "ستوب!" عندما تنتهي، أو انتظر انتهاء الوقت لإيقاف الجولة للجميع.</li>
                        <li>يتم احتساب النقاط تلقائيًا، واللاعب صاحب أعلى نقاط في النهاية هو الفائز!</li>
                    </ol>
                </div>

                <div className="space-y-2 text-center pt-4 border-t border-gray-700/50">
                    <h3 className="text-xl font-bold text-gray-400">مطور اللعبة</h3>
                    <p className="text-lg font-semibold text-white">عبدالحميد العبري</p>
                    <p className="text-lg font-mono text-cyan-400">alabri@gmail.com</p>
                </div>

                <div className="text-center pt-2">
                    <button 
                        onClick={() => setIsAboutModalOpen(false)}
                        className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-lg font-bold transition-transform transform hover:scale-105"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default HomeScreen;