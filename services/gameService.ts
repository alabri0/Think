
import mqtt from 'mqtt';
import { Game, GameState, Player, PlayerAnswers, RoundData, RoundScores, ValidationResult } from '../types';
import { ARABIC_LETTERS, CORE_CATEGORIES } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";

// --- Real-time Multiplayer Configuration ---
// Using a public MQTT broker for simplicity. For a production application,
// it's recommended to set up a private, secure MQTT broker.
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
    // Ensure API_KEY is handled safely
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("API_KEY is not set.");
        // Return a zero-score result if AI cannot be used
        const roundScores: RoundScores = {};
        const validationDetails: { [playerId: string]: { [category: string]: ValidationResult } } = {};
        Object.keys(roundData).forEach(playerId => {
            roundScores[playerId] = 0;
            validationDetails[playerId] = {};
            categories.forEach(cat => {
                validationDetails[playerId][cat] = { isValid: false, score: 0 };
            });
        });
        return { roundScores, validationDetails };
    }

    const ai = new GoogleGenAI({ apiKey });
    
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

        const validationData = JSON.parse(response.text).results;

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
    } catch (error) {
        console.error("AI validation failed:", error);
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
};


// --- Subscription Management ---
const subscribe = (callback: (game: Game | null) => void) => {
  subscribers.push(callback);
};

const unsubscribe = (callback: (game: Game | null) => void) => {
  subscribers = subscribers.filter(cb => cb !== callback);
};

// --- Game State Access ---
const getGame = (): Game | null => game;
const getCurrentPlayerId = (): string | null => localStorage.getItem(PLAYER_ID_KEY);

// --- Connection Logic ---
const _connect = (gameCode: string, onConnect: () => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (client && client.connected) {
        onConnect();
        resolve();
        return;
    }

    const options = {
        keepalive: 120,
        reconnectPeriod: 2000,
        connectTimeout: 30 * 1000,
    };

    const newClient = mqtt.connect(MQTT_BROKER_URL, options);

    newClient.on('connect', () => {
      client = newClient;
      localStorage.setItem(GAME_CODE_KEY, gameCode);
      onConnect();
      resolve();
    });

    newClient.on('error', (err) => {
      console.error('MQTT Connection Error:', err);
      alert('لا يمكن الاتصال بالخادم. الرجاء المحاولة مرة أخرى.');
      newClient.end();
      client = null;
      reject(err);
    });
  });
};

const _handleHostActions = async (topic: string, message: any) => {
    try {
        const action = JSON.parse(message.toString());
        if (!game || !game.players.find(p => p.id === getCurrentPlayerId())?.isHost) return;

        let needsStateUpdate = true;
        let newGame: Game | null = { ...game }; // Create a new object reference

        switch (action.type) {
            case 'PLAYER_JOIN': {
                const newPlayer = action.payload as Player;
                if (!newGame.players.some(p => p.id === newPlayer.id)) {
                    newGame.players = [...newGame.players, newPlayer]; // Create new players array
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
                }

                const allSubmitted = newGame.players.every(p => p.answersSubmitted);

                if (allSubmitted) {
                    newGame.gameState = GameState.SCORING;
                    game = newGame; // Update state immediately for spinner
                     _notify();
                    _publishState(); // Publish scoring state so clients also see spinner

                    const { roundScores, validationDetails } = await _validateAnswers(game.roundData, game.categories, game.currentLetter);
                    
                    // After async, create the final new game state from the latest version
                    const finalGame = { ...game };
                    finalGame.lastRoundScores = roundScores;
                    finalGame.roundValidation = validationDetails;
                    finalGame.players = finalGame.players.map(p => ({
                        ...p,
                        score: p.score + (roundScores[p.id] || 0)
                    }));
                    newGame = finalGame; // Set the final state
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
                break;
            }
            case 'PLAYER_LEAVE': {
                const { playerId } = action.payload;
                if (newGame.players.find(p => p.id === playerId)?.isHost) {
                    alert('المضيف غادر اللعبة. ستنتهي اللعبة.');
                    newGame = null;
                    localStorage.removeItem(GAME_CODE_KEY);
                    client?.end();
                    client = null;
                } else {
                    newGame.players = newGame.players.filter(p => p.id !== playerId);
                }
                break;
            }
            default:
                needsStateUpdate = false;
        }
        
        game = newGame; // Atomically assign the new game object

        if (needsStateUpdate && game) {
            _publishState();
        }
        _notify();
    } catch(e) {
        console.error("Error handling host action:", e);
    }
}

const _handleStateUpdate = (topic: string, message: any) => {
    try {
        const updatedGame = JSON.parse(message.toString()) as Game;
        const currentPlayerId = getCurrentPlayerId();
        const isHost = updatedGame.players.some(p => p.id === currentPlayerId && p.isHost);
        
        // Non-hosts always accept the state from the host
        if (!isHost) {
            game = updatedGame;
            _notify();
        }
    } catch (e) {
        console.error("Error processing game state update:", e);
    }
}

// --- Public API ---
const createGame = async (playerName: string): Promise<void> => {
    const gameCode = _generateGameCode();
    const playerId = _generatePlayerId();

    const hostPlayer: Player = {
        id: playerId,
        name: playerName,
        score: 0,
        isHost: true,
        answersSubmitted: false,
        avatarUrl: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${playerId}`
    };

    game = {
        gameCode,
        gameState: GameState.LOBBY,
        players: [hostPlayer],
        categories: CORE_CATEGORIES,
        totalRounds: 5,
        currentRound: 0,
        currentLetter: '',
        usedLetters: [],
        roundData: {},
    };

    await _connect(gameCode, () => {
        client?.subscribe(`${TOPIC_PREFIX}/${gameCode}/host-actions`, { qos: 1 });
        client?.on('message', _handleHostActions);
    });
    
    _notify();
};

const joinGame = async (gameCode: string, playerName: string): Promise<void> => {
    const playerId = _generatePlayerId();
    
    await _connect(gameCode, () => {
        client?.subscribe(`${TOPIC_PREFIX}/${gameCode}/state`, { qos: 1 });
        client?.on('message', _handleStateUpdate);
        
        const newPlayer: Player = {
            id: playerId,
            name: playerName,
            score: 0,
            isHost: false,
            answersSubmitted: false,
            avatarUrl: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${playerId}`
        };
        // Set a temporary game object until we get the state from the host
        game = {
            gameCode,
            gameState: GameState.LOBBY,
            players: [newPlayer],
            categories: [], totalRounds: 0, currentRound: 0, currentLetter: '', usedLetters: [], roundData: {}
        };
        _publishAction({ type: 'PLAYER_JOIN', payload: newPlayer });
    });
};

const leaveGame = () => {
    const playerId = getCurrentPlayerId();
    if (playerId) {
        _publishAction({ type: 'PLAYER_LEAVE', payload: { playerId }});
    }
    client?.end();
    client = null;
    game = null;
    localStorage.removeItem(GAME_CODE_KEY);
    _notify();
};

const updatePlayerAvatar = (avatarUrl: string) => {
    const playerId = getCurrentPlayerId();
    if(playerId) {
         _publishAction({ type: 'UPDATE_AVATAR', payload: { playerId, avatarUrl }});
    }
};

const updateSettings = (settings: { rounds?: number; categories?: string[] }) => {
    _publishAction({ type: 'UPDATE_SETTINGS', payload: settings });
};

const startGame = () => _publishAction({ type: 'START_GAME' });
const chooseLetter = (letter: string) => _publishAction({ type: 'CHOOSE_LETTER', payload: { letter }});
const nextRound = () => _publishAction({ type: 'NEXT_ROUND' });
const endGame = () => _publishAction({ type: 'END_GAME' });
const playAgain = () => _publishAction({ type: 'PLAY_AGAIN' });

const endRound = (playerId: string, answers: PlayerAnswers) => {
    _publishAction({ type: 'END_ROUND', payload: { playerId, answers } });
};

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
  updatePlayerAvatar,
  updateSettings,
  startGame,
  chooseLetter,
  endRound,
  nextRound,
  endGame,
  playAgain,
  saveDraftAnswers,
  getDraftAnswers,
};