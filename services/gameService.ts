import { Game, GameState, Player, PlayerAnswers, RoundData, RoundScores, ValidationResult } from '../types';
import { ARABIC_LETTERS, CORE_CATEGORIES } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";

const GAME_KEY_PREFIX = 'insaan-hayawaan-';
const PLAYER_ID_KEY = 'insaan-hayawaan-player-id';
const GAME_CODE_KEY = 'insaan-hayawaan-game-code';
const DRAFT_KEY_PREFIX = 'insaan-hayawaan-draft-';


class GameService {
  private subscribers: ((game: Game | null) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
        window.addEventListener('storage', (event) => {
            const gameCode = this._getGameCode();
            if (event.key === `${GAME_KEY_PREFIX}${gameCode}`) {
                this._notify();
            }
        });
    }
  }

  private _getGameCode = (): string | null => localStorage.getItem(GAME_CODE_KEY);
  private _setGameCode = (code: string) => localStorage.setItem(GAME_CODE_KEY, code);
  private _clearGameCode = () => localStorage.removeItem(GAME_CODE_KEY);
  
  private _saveGame = (game: Game) => {
    localStorage.setItem(`${GAME_KEY_PREFIX}${game.gameCode}`, JSON.stringify(game));
    this._notify();
  };
  
  private _notify = () => {
    const game = this.getGame();
    this.subscribers.forEach(cb => cb(game));
  };
  
  private _generateGameCode = (): string => Math.random().toString(36).substring(2, 7).toUpperCase();
  private _generatePlayerId = (): string => Math.random().toString(36).substring(2, 11);

  subscribe = (callback: (game: Game | null) => void) => {
    this.subscribers.push(callback);
  };
  
  unsubscribe = (callback: (game: Game | null) => void) => {
    this.subscribers = this.subscribers.filter(cb => cb !== callback);
  };

  getGame = (): Game | null => {
    const gameCode = this._getGameCode();
    if (!gameCode) return null;
    const gameJson = localStorage.getItem(`${GAME_KEY_PREFIX}${gameCode}`);
    return gameJson ? JSON.parse(gameJson) : null;
  };
  
  getCurrentPlayerId = (): string | null => {
    return localStorage.getItem(PLAYER_ID_KEY);
  };

  private _getDraftKey = (playerId: string, round: number): string | null => {
    const gameCode = this._getGameCode();
    if (!gameCode) return null;
    return `${DRAFT_KEY_PREFIX}${gameCode}-${round}-${playerId}`;
  }

  saveDraftAnswers = (answers: PlayerAnswers) => {
      const game = this.getGame();
      const playerId = this.getCurrentPlayerId();
      if (game && playerId) {
        const key = this._getDraftKey(playerId, game.currentRound);
        if (key) {
            localStorage.setItem(key, JSON.stringify(answers));
        }
      }
  }
  
  private _getDraftAnswersForPlayer = (playerId: string, round: number): PlayerAnswers | null => {
    const key = this._getDraftKey(playerId, round);
    if (!key) return null;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  getDraftAnswers = (): PlayerAnswers | null => {
      const game = this.getGame();
      const playerId = this.getCurrentPlayerId();
      if (!game || !playerId) return null;
      return this._getDraftAnswersForPlayer(playerId, game.currentRound);
  }
  
  private _clearDraftAnswersForPlayer = (playerId: string, round: number) => {
    const key = this._getDraftKey(playerId, round);
    if (key) {
        localStorage.removeItem(key);
    }
  }

  createGame = (playerName: string) => {
    const gameCode = this._generateGameCode();
    const playerId = this._generatePlayerId();
    
    const host: Player = { 
      id: playerId, 
      name: playerName, 
      score: 0, 
      isHost: true, 
      answersSubmitted: false,
      avatarUrl: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${playerId}`
    };
    
    const game: Game = {
      gameCode,
      gameState: GameState.LOBBY,
      players: [host],
      categories: CORE_CATEGORIES,
      totalRounds: 5,
      currentRound: 1,
      currentLetter: '',
      usedLetters: [],
      roundData: {}
    };
    
    this._setGameCode(gameCode);
    localStorage.setItem(PLAYER_ID_KEY, playerId);
    this._saveGame(game);
  };

  joinGame = (gameCode: string, playerName: string) => {
    const gameJson = localStorage.getItem(`${GAME_KEY_PREFIX}${gameCode}`);
    if (!gameJson) {
        alert("رمز اللعبة غير صحيح!");
        return;
    }
    const game: Game = JSON.parse(gameJson);
    const playerId = this._generatePlayerId();
    
    const newPlayer: Player = { 
        id: playerId, 
        name: playerName, 
        score: 0, 
        isHost: false, 
        answersSubmitted: false,
        avatarUrl: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${playerId}`
    };
    game.players.push(newPlayer);
    
    this._setGameCode(gameCode);
    localStorage.setItem(PLAYER_ID_KEY, playerId);
    this._saveGame(game);
  };
  
  updateSettings = (settings: { categories?: string[], rounds?: number }) => {
      const game = this.getGame();
      if (!game) return;
      if (settings.categories) game.categories = settings.categories;
      if (settings.rounds) game.totalRounds = settings.rounds;
      this._saveGame(game);
  }

  updatePlayerAvatar = (avatarUrl: string) => {
      const game = this.getGame();
      const playerId = this.getCurrentPlayerId();
      if (!game || !playerId) return;

      const player = game.players.find(p => p.id === playerId);
      if (player) {
          player.avatarUrl = avatarUrl;
          this._saveGame(game);
      }
  }

  startGame = () => {
    const game = this.getGame();
    if (!game) return;
    game.gameState = GameState.SPINNING;
    this._saveGame(game);
  };
  
  chooseLetter = (letter: string) => {
    const game = this.getGame();
    if (!game) return;
    game.currentLetter = letter;
    game.usedLetters.push(letter);
    game.gameState = GameState.PLAYING;
    this._saveGame(game);
  }
  
  endRound = (initiatingPlayerId: string, initiatingPlayerAnswers: PlayerAnswers) => {
      const game = this.getGame();
      if (!game || game.gameState !== GameState.PLAYING) return;

      const finalRoundData: RoundData = {};
      finalRoundData[initiatingPlayerId] = initiatingPlayerAnswers;

      game.players.forEach(player => {
          if (player.id !== initiatingPlayerId) {
              const draftAnswers = this._getDraftAnswersForPlayer(player.id, game.currentRound);
              finalRoundData[player.id] = draftAnswers || game.categories.reduce((acc, cat) => ({ ...acc, [cat]: '' }), {});
          }
          // Clear drafts for everyone for this round
          this._clearDraftAnswersForPlayer(player.id, game.currentRound);
      });

      game.roundData = finalRoundData;
      game.gameState = GameState.SCORING;
      game.players.forEach(p => p.answersSubmitted = true);

      this._saveGame(game);

      (async () => {
          const gameForScoring = this.getGame();
          if (gameForScoring && gameForScoring.gameState === GameState.SCORING && (!gameForScoring.lastRoundScores || Object.keys(gameForScoring.lastRoundScores).length === 0) ) {
              await this._calculateAndApplyScores(gameForScoring);
              this._saveGame(gameForScoring);
          }
      })();
  }
  
  private _validateAnswersAI = async (game: Game): Promise<{ [playerId: string]: { [category: string]: boolean } }> => {
    const validationResults: { [playerId: string]: { [category: string]: boolean } } = {};

    const uniqueAnswersToValidate: { answer: string; category: string }[] = [];
    const answerMap = new Map<string, { playerId: string; category: string }[]>();

    for (const player of game.players) {
        validationResults[player.id] = {};
        for (const category of game.categories) {
            const answer = game.roundData[player.id]?.[category]?.trim();
            if (answer && answer.startsWith(game.currentLetter)) {
                const key = `${answer}|${category}`;
                if (!answerMap.has(key)) {
                    answerMap.set(key, []);
                    uniqueAnswersToValidate.push({ answer, category });
                }
                answerMap.get(key)?.push({ playerId: player.id, category });
            } else {
                validationResults[player.id][category] = false;
            }
        }
    }

    if (uniqueAnswersToValidate.length === 0) {
        return validationResults;
    }
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const properties: { [key: string]: { type: Type, description: string } } = {};
        uniqueAnswersToValidate.forEach(item => {
            const key = `${item.answer}|${item.category}`;
            properties[key] = {
                type: Type.BOOLEAN,
                description: `Is "${item.answer}" a valid ${item.category} starting with "${game.currentLetter}"?`
            };
        });

        const responseSchema = {
            type: Type.OBJECT,
            properties: properties,
        };
        
        const prompt = `You are an expert judge for the "Plant, Animal, Inanimate Object, Country" game.
    For the letter "${game.currentLetter}", validate the answers provided in the schema.
    An answer is valid if it's a real thing in the correct category and starts with the letter "${game.currentLetter}". Ignore case and minor typos.
    Respond with a JSON object conforming to the provided schema.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        const results = JSON.parse(response.text);

        for (const key in results) {
            if (results.hasOwnProperty(key)) {
                const isValid = results[key];
                const playerEntries = answerMap.get(key);
                if (playerEntries) {
                    playerEntries.forEach(entry => {
                        validationResults[entry.playerId][entry.category] = isValid;
                    });
                }
            }
        }
    } catch (e) {
        console.error("AI Validation failed:", e);
        // Fallback: consider all answers that start with the letter as valid
        for (const key of answerMap.keys()) {
            const playerEntries = answerMap.get(key);
            if (playerEntries) {
                playerEntries.forEach(entry => {
                    validationResults[entry.playerId][entry.category] = true;
                });
            }
        }
    }

    return validationResults;
  }
  
  private _calculateAndApplyScores = async (game: Game) => {
      const correctnessResults = await this._validateAnswersAI(game);
      const detailedValidation: { [playerId: string]: { [category: string]: ValidationResult } } = {};
      game.players.forEach(p => detailedValidation[p.id] = {});
      
      const roundScores: RoundScores = game.players.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {});

      game.categories.forEach(category => {
          const validAnswersForCategory: { playerId: string; answer: string }[] = [];

          // First pass: collect valid answers and initialize detailed validation map
          game.players.forEach(player => {
              const isValid = correctnessResults[player.id]?.[category] || false;
              detailedValidation[player.id][category] = { isValid, score: 0 };
              if (isValid) {
                  const answer = game.roundData[player.id]?.[category]?.trim().toLowerCase();
                  if (answer) {
                      validAnswersForCategory.push({ playerId: player.id, answer });
                  }
              }
          });

          // Count occurrences of each valid answer
          const answerCounts: { [answer: string]: number } = {};
          validAnswersForCategory.forEach(({ answer }) => {
              answerCounts[answer] = (answerCounts[answer] || 0) + 1;
          });

          // Second pass: assign scores based on uniqueness
          validAnswersForCategory.forEach(({ playerId, answer }) => {
              let score = 0;
              if (answerCounts[answer] === 1) {
                  score = 10; // Unique
              } else if (answerCounts[answer] > 1) {
                  score = 5; // Duplicate
              }
              detailedValidation[playerId][category].score = score;
          });
      });

      // Sum up scores for the round
      game.players.forEach(player => {
        let totalRoundScore = 0;
        game.categories.forEach(category => {
            totalRoundScore += detailedValidation[player.id][category].score || 0;
        });
        roundScores[player.id] = totalRoundScore;
        player.score += totalRoundScore;
      });

      game.roundValidation = detailedValidation;
      game.lastRoundScores = roundScores;
  }
  
  nextRound = () => {
      const game = this.getGame();
      if (!game) return;
      
      if (game.currentRound >= game.totalRounds) {
          game.gameState = GameState.WINNER;
      } else {
          game.currentRound++;
          game.roundData = {};
          game.lastRoundScores = {};
          game.roundValidation = {};
          game.players.forEach(p => p.answersSubmitted = false);
          game.gameState = GameState.SPINNING;
      }
      this._saveGame(game);
  }
  
  playAgain = () => {
      const game = this.getGame();
      if (!game) return;

      game.gameState = GameState.LOBBY;
      game.currentRound = 1;
      game.usedLetters = [];
      game.roundData = {};
      game.lastRoundScores = {};
      game.roundValidation = {};
      game.players.forEach(p => {
          p.score = 0;
          p.answersSubmitted = false;
      });
      this._saveGame(game);
  }
  
  endGame = () => {
    const game = this.getGame();
    if (!game) return;
    game.gameState = GameState.WINNER;
    this._saveGame(game);
  }

  leaveGame = () => {
      this._clearGameCode();
      localStorage.removeItem(PLAYER_ID_KEY);
      this._notify();
  }
}

export const gameService = new GameService();