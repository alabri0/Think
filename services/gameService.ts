
import mqtt from 'mqtt';
import { Game, GameState, Player, PlayerAnswers, RoundData, RoundScores, ValidationResult } from '../types';
import { ARABIC_LETTERS, CORE_CATEGORIES } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";

// --- Real-time Multiplayer Configuration ---
const MQTT_BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
const TOPIC_PREFIX = 'insaan-hayawaan-v2';

// --- Local Keys ---
const PLAYER_ID_KEY = 'insaan-hayawaan-player-id';
const GAME_CODE_KEY = 'insaan-hayawaan-game-code';

// --- Service State ---
let client: mqtt.MqttClient | null = null;
let game: Game | null = null;
let subscribers: ((game: Game | null) => void)[] = [];
let liveDrafts: { [letter: string]: PlayerAnswers } = {};

// --- Helper Functions ---
const _notify = () => {
  subscribers.forEach(cb => cb(game));
};

const _generateGameCode = (): string => Math.random().toString(36).substring(2, 7).toUpperCase();

const _generatePlayerId = (): string => {
  let pid = localStorage.getItem(PLAYER_ID_KEY);
  if (!pid) {
    pid = `player_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(PLAYER_ID_KEY, pid);
  }
  return pid;
};

const _publishState = () => {
  if (client && game && game.players.find(p => p.id === getCurrentPlayerId())?.isHost) {
    client.publish(`${TOPIC_PREFIX}/${game.gameCode}/state`, JSON.stringify(game), { qos: 1 });
  }
};

const _publishAction = (action: { type: string; payload?: any }) => {
    if (client && game) {
        client.publish(`${TOPIC_PREFIX}/${game.gameCode}/host-actions`, JSON.stringify(action));
    }
}

// --- AI Validation ---
const _validateAnswers = async (roundData: RoundData, categories: string[], letter: string): Promise<{ roundScores: RoundScores, validationDetails: { [playerId: string]: { [category: string]: ValidationResult } } }> => {
    // The API key is assumed to be available in the execution environment via process.env.API_KEY.
    // On platforms like Vercel, this won't be exposed to the client-side for security reasons.
    if (!process.env.API_KEY) {
        const errorMsg = 'مفتاح API الخاص بـ Google AI غير متوفر. لا يمكن التحقق من الإجابات. تأكد من أن متغير البيئة API_KEY تم إعداده بشكل صحيح في بيئة النشر الخاصة بك.';
        console.error("Google AI API Key is missing. Ensure the API_KEY environment variable is set correctly and exposed to the client-side if necessary (note: this is insecure). The recommended approach is to use a serverless function.");
        throw new Error(errorMsg);
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const allAnswers: {playerId: string, category: string, answer: string}[] = [];
    Object.entries(roundData).forEach(([playerId, playerAnswers]) => {
        Object.entries(playerAnswers).forEach(([category, answer]) => {
            if(answer && answer.trim()){
                allAnswers.push({ playerId, category, answer: answer.trim() });
            }
        });
    });

    if (allAnswers.length === 0) {
        const roundScores: RoundScores = {};
        const validationDetails: { [playerId: string]: { [category: string]: ValidationResult } } = {};
        Object.keys(roundData).forEach(playerId => {
            roundScores[playerId] = 0;
            validationDetails[playerId] = {};
            categories.forEach(cat => {
                validationDetails[playerId][cat] = { isValid: false, score: 0};
            })
        });
        return { roundScores, validationDetails };
    }

    const prompt = `
        You are the judge in an Arabic word game. The letter for this round is "${letter}".
        The categories are: ${categories.join(', ')}.
        Validate each answer based on these rules:
        1.  The word must be a real, known Arabic word that fits the category.
        2.  The word must start with the letter "${letter}".
        3.  Score 10 points for a valid, unique answer in a category.
        4.  Score 5 points for a valid, but duplicated answer in a category.
        5.  Score 0 for an invalid answer (wrong letter, wrong category, not a real word, etc.) or an empty answer.
        
        Return a JSON object with a single key "results", an array of objects. Each object must have "playerId", "category", "answer", "isValid" (boolean), and "score" (10, 5, or 0).
        
        Answers: ${JSON.stringify(allAnswers)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        results: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    playerId: { type: Type.STRING },
                                    category: { type: Type.STRING },
                                    answer: { type: Type.STRING },
                                    isValid: { type: Type.BOOLEAN },
                                    score: { type: Type.INTEGER },
                                },
                                required: ["playerId", "category", "answer", "isValid", "score"]
                            }
                        }
                    },
                     required: ["results"]
                }
            }
        });
        
        let responseText = response.text.trim();
        if (responseText.startsWith('```json')) {
            responseText = responseText.substring(7, responseText.length - 3).trim();
        } else if (responseText.startsWith('```')) {
             responseText = responseText.substring(3, responseText.length - 3).trim();
        }

        const validationData = JSON.parse(responseText).results;
        const roundScores: RoundScores = {};
        const validationDetails: { [playerId: string]: { [category: string]: ValidationResult } } = {};
        Object.keys(roundData).forEach(pid => {
            roundScores[pid] = 0;
            validationDetails[pid] = {};
        });

        validationData.forEach((res: any) => {
            if (roundScores[res.playerId] !== undefined) {
                roundScores[res.playerId] += res.score;
                validationDetails[res.playerId][res.category] = { isValid: res.isValid, score: res.score };
            }
        });
        
        return { roundScores, validationDetails };
    } catch (error: any) {
        console.error("AI validation failed:", error);
        // Provide a more specific error message back to the user interface.
        throw new Error(`فشل تقييم الذكاء الاصطناعي: ${error.message}. يرجى التحقق من صحة مفتاح API.`);
    }
};

// --- Message Handlers ---
const _handleHostActions = async (topic: string, message: any) => {
    try {
        const action = JSON.parse(message.toString());
        if (!game || !game.players.find(p => p.id === getCurrentPlayerId())?.isHost) return;

        let needsStateUpdate = true;
        let newGame: Game = JSON.parse(JSON.stringify(game)); // Deep copy to avoid mutation issues

        switch (action.type) {
            case 'PLAYER_JOIN': {
                const newPlayer = action.payload as Player;
                if (!newGame.players.some(p => p.id === newPlayer.id)) {
                    newGame.players = [...newGame.players, newPlayer];
                }
                break;
            }
            case 'UPDATE_AVATAR': {
                 const { playerId, avatarUrl } = action.payload;
                 newGame.players = newGame.players.map(p => p.id === playerId ? { ...p, avatarUrl } : p);
                 break;
            }
            case 'UPDATE_SETTINGS': {
                const { rounds, categories } = action.payload;
                if (rounds) newGame.totalRounds = rounds;
                if (categories) newGame.categories = categories;
                break;
            }
            case 'START_GAME': {
                newGame.gameState = GameState.SPINNING;
                newGame.currentRound = 1;
                newGame.usedLetters = [];
                break;
            }
            case 'CHOOSE_LETTER': {
                newGame.currentLetter = action.payload.letter;
                newGame.usedLetters = [...newGame.usedLetters, action.payload.letter];
                newGame.gameState = GameState.PLAYING;
                newGame.players = newGame.players.map(p => ({ ...p, answersSubmitted: false }));
                newGame.roundData = {};
                break;
            }
            case 'END_ROUND': {
                const { playerId, answers } = action.payload;
                const player = newGame.players.find(p => p.id === playerId);

                if (player && !player.answersSubmitted) {
                    newGame.players = newGame.players.map(p => p.id === playerId ? { ...p, answersSubmitted: true } : p);
                    newGame.roundData = { ...newGame.roundData, [playerId]: answers };

                    if (game?.gameState === GameState.PLAYING) {
                        newGame.gameState = GameState.SCORING;
                    }
                }

                const allSubmitted = newGame.players.every(p => p.answersSubmitted);

                if (allSubmitted) {
                    newGame.gameState = GameState.SCORING; 
                    newGame.aiError = undefined;
                    game = newGame;
                    _publishState(); 

                    try {
                        const { roundScores, validationDetails } = await _validateAnswers(game.roundData, game.categories, game.currentLetter);
                        
                        const finalGame = { ...game };
                        finalGame.lastRoundScores = roundScores;
                        finalGame.roundValidation = validationDetails;
                        finalGame.players = finalGame.players.map(p => ({
                            ...p,
                            score: p.score + (roundScores[p.id] || 0)
                        }));
                        newGame = finalGame;
                    } catch (e: any) {
                         // AI failed, let's give everyone 0 points for the round and show an error.
                        const roundScores: RoundScores = {};
                        Object.keys(newGame.roundData).forEach(pid => {
                            roundScores[pid] = 0;
                        });

                        newGame.lastRoundScores = roundScores;
                        newGame.roundValidation = {}; // No validation details
                        // Players scores don't change
                        newGame.players = newGame.players.map(p => ({
                            ...p,
                            score: p.score // no change
                        }));
                        newGame.aiError = e.message || 'حدث خطأ غير معروف أثناء التحقق من صحة الذكاء الاصطناعي.';
                    }
                }
                break;
            }
             case 'NEXT_ROUND': {
                if (newGame.currentRound >= newGame.totalRounds) {
                    newGame.gameState = GameState.WINNER;
                } else {
                    newGame.currentRound++;
                    newGame.gameState = GameState.SPINNING;
                    newGame.currentLetter = '';
                    newGame.roundData = {};
                    newGame.lastRoundScores = {};
                    newGame.roundValidation = {};
                    newGame.aiError = undefined;
                }
                break;
            }
            case 'MANUAL_OVERRIDE_SCORE': {
                const { playerId, category, newScore } = action.payload;
                const player = newGame.players.find(p => p.id === playerId);
                const validation = newGame.roundValidation?.[playerId]?.[category];

                if (player && validation) {
                    const oldScore = validation.score;
                    const scoreDifference = newScore - oldScore;

                    if (scoreDifference === 0) {
                        needsStateUpdate = false;
                        break;
                    }
                    
                    newGame.roundValidation[playerId][category] = {
                        isValid: newScore > 0,
                        score: newScore,
                    };

                    if (!newGame.lastRoundScores) newGame.lastRoundScores = {};
                    newGame.lastRoundScores[playerId] = (newGame.lastRoundScores[playerId] || 0) + scoreDifference;
                    
                    newGame.players = newGame.players.map(p =>
                        p.id === playerId ? { ...p, score: p.score + scoreDifference } : p
                    );
                } else {
                    needsStateUpdate = false; 
                }
                break;
            }
            case 'END_GAME': {
                 newGame.gameState = GameState.WINNER;
                 break;
            }
            case 'PLAY_AGAIN': {
                newGame.gameState = GameState.LOBBY;
                newGame.currentRound = 0;
                newGame.usedLetters = [];
                newGame.currentLetter = '';
                newGame.roundData = {};
                newGame.lastRoundScores = {};
                newGame.roundValidation = {};
                newGame.players = newGame.players.map(p => ({ ...p, score: 0 }));
                newGame.aiError = undefined;
                break;
            }
            case 'PLAYER_LEAVE': {
                const { playerId } = action.payload;
                if (newGame.players.find(p => p.id === playerId)?.isHost) {
                    client?.publish(`${TOPIC_PREFIX}/${game.gameCode}/state`, JSON.stringify({ ...newGame, gameState: GameState.HOME }));
                    game = null; 
                    _notify();
                    return; 
                } else {
                    newGame.players = newGame.players.filter(p => p.id !== playerId);
                }
                break;
            }
            default:
                needsStateUpdate = false;
        }
        
        game = newGame;

        if (needsStateUpdate) {
            _publishState();
        }
    } catch(e) {
        console.error("Error handling host action:", e);
    }
}


const _handleStateUpdate = (topic: string, message: any) => {
    try {
        const updatedGame = JSON.parse(message.toString()) as Game;

        if (updatedGame.gameState === GameState.HOME) {
            alert('انتهت اللعبة لأن المضيف غادر.');
            client?.end();
            client = null;
            game = null;
            localStorage.removeItem(GAME_CODE_KEY);
            _notify();
            return;
        }
        
        game = updatedGame;
        _notify();
    } catch (e) {
        console.error("Error processing game state update:", e);
    }
}

const _onMessage = (topic: string, message: any) => {
    const gameCode = localStorage.getItem(GAME_CODE_KEY);
    if (!gameCode) return;

    const stateTopic = `${TOPIC_PREFIX}/${gameCode}/state`;
    const actionTopic = `${TOPIC_PREFIX}/${gameCode}/host-actions`;
    
    if (topic === actionTopic) {
        const isHost = !!game?.players.find(p => p.id === getCurrentPlayerId() && p.isHost);
        if (isHost) {
            _handleHostActions(topic, message);
        }
    } 
    else if (topic === stateTopic) {
        _handleStateUpdate(topic, message);
    }
};

// --- Subscription Management ---
const subscribe = (callback: (game: Game | null) => void) => { subscribers.push(callback); };
const unsubscribe = (callback: (game: Game | null) => void) => { subscribers = subscribers.filter(cb => cb !== callback); };

// --- Game State Access ---
const getGame = (): Game | null => game;
const getCurrentPlayerId = (): string | null => localStorage.getItem(PLAYER_ID_KEY);

// --- Connection Logic ---
const _connect = (gameCode: string, playerId: string, onConnect: () => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (client && client.connected) {
        onConnect();
        resolve();
        return;
    }

    const options = {
        clientId: `${TOPIC_PREFIX}-${gameCode}-${playerId}-${Date.now()}`,
        keepalive: 120,
        reconnectPeriod: 2000,
        connectTimeout: 30 * 1000,
        clean: true,
    };
    const newClient = mqtt.connect(MQTT_BROKER_URL, options);

    newClient.on('connect', () => {
      client = newClient;
      localStorage.setItem(GAME_CODE_KEY, gameCode);
      client.removeListener('message', _onMessage);
      client.on('message', _onMessage);
      onConnect();
      resolve();
    });

    newClient.on('error', (err) => {
      console.error('MQTT Connection Error:', err);
      if (err.message.includes('Not authorized')) {
        alert('حدث خطأ في المصادقة. قد يكون رمز اللعبة غير صحيح أو هناك مشكلة في الشبكة.');
      } else {
        alert('لا يمكن الاتصال بالخادم. الرجاء المحاولة مرة أخرى.');
      }
      newClient.end();
      client = null;
      reject(err);
    });
  });
};

// --- Public API ---
const createGame = async (playerName: string): Promise<void> => {
    const gameCode = _generateGameCode();
    const playerId = _generatePlayerId();

    const hostPlayer: Player = {
        id: playerId, name: playerName, score: 0, isHost: true, answersSubmitted: false,
        avatarUrl: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${playerId}`
    };

    game = {
        gameCode, gameState: GameState.LOBBY, players: [hostPlayer], categories: CORE_CATEGORIES,
        totalRounds: 5, currentRound: 0, currentLetter: '', usedLetters: [], roundData: {},
    };

    await _connect(gameCode, playerId, () => {
        client?.subscribe(`${TOPIC_PREFIX}/${gameCode}/host-actions`, { qos: 1 });
        client?.subscribe(`${TOPIC_PREFIX}/${gameCode}/state`, { qos: 1 });
    });
    
    _notify();
};

const joinGame = async (gameCode: string, playerName: string): Promise<void> => {
    const playerId = _generatePlayerId();
    
    await _connect(gameCode, playerId, () => {
        client?.subscribe(`${TOPIC_PREFIX}/${gameCode}/state`, { qos: 1 });
        
        const newPlayer: Player = {
            id: playerId, name: playerName, score: 0, isHost: false, answersSubmitted: false,
            avatarUrl: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${playerId}`
        };
        
        game = {
            gameCode, gameState: GameState.LOBBY, players: [newPlayer], categories: [], 
            totalRounds: 0, currentRound: 0, currentLetter: '', usedLetters: [], roundData: {}
        };
        _notify();
        _publishAction({ type: 'PLAYER_JOIN', payload: newPlayer });
    });
};

const leaveGame = () => {
    const playerId = getCurrentPlayerId();
    if (playerId && client?.connected) {
        _publishAction({ type: 'PLAYER_LEAVE', payload: { playerId }});
        setTimeout(() => {
            client?.end(true, () => {
              client = null;
              game = null;
              localStorage.removeItem(GAME_CODE_KEY);
              _notify();
            });
        }, 500); 
    } else {
        client?.end(true);
        client = null;
        game = null;
        localStorage.removeItem(GAME_CODE_KEY);
        _notify();
    }
};

const updatePlayerAvatar = (avatarUrl: string) => {
    const playerId = getCurrentPlayerId();
    if(playerId) {
         _publishAction({ type: 'UPDATE_AVATAR', payload: { playerId, avatarUrl }});
    }
};

const manualOverrideScore = (playerId: string, category: string, newScore: 10 | 5 | 0) => {
    _publishAction({ type: 'MANUAL_OVERRIDE_SCORE', payload: { playerId, category, newScore } });
};

const updateSettings = (settings: { rounds?: number; categories?: string[] }) => _publishAction({ type: 'UPDATE_SETTINGS', payload: settings });
const startGame = () => _publishAction({ type: 'START_GAME' });
const chooseLetter = (letter: string) => _publishAction({ type: 'CHOOSE_LETTER', payload: { letter }});
const nextRound = () => _publishAction({ type: 'NEXT_ROUND' });
const endGame = () => _publishAction({ type: 'END_GAME' });
const playAgain = () => _publishAction({ type: 'PLAY_AGAIN' });
const endRound = (playerId: string, answers: PlayerAnswers) => _publishAction({ type: 'END_ROUND', payload: { playerId, answers } });

// --- Local Drafts ---
const saveDraftAnswers = (answers: PlayerAnswers) => {
    if (game && game.currentLetter) {
        liveDrafts[game.currentLetter] = answers;
    }
};

const getDraftAnswers = (): PlayerAnswers | null => {
    if (game && game.currentLetter) {
        return liveDrafts[game.currentLetter] || null;
    }
    return null;
};

export const gameService = {
  subscribe,
  unsubscribe,
  getGame,
  getCurrentPlayerId,
  createGame,
  joinGame,
  leaveGame,
  updateSettings,
  startGame,
  chooseLetter,
  endRound,
  nextRound,
  endGame,
  playAgain,
  saveDraftAnswers,
  getDraftAnswers,
  updatePlayerAvatar,
  manualOverrideScore,
};