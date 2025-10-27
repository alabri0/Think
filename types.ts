export enum GameState {
  HOME,
  LOBBY,
  SPINNING,
  PLAYING,
  SCORING,
  WINNER,
}

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  answersSubmitted: boolean;
  avatarUrl?: string;
}

export type PlayerAnswers = {
  [category: string]: string;
};

export type RoundData = {
  [playerId: string]: PlayerAnswers;
};

export type RoundScores = {
  [playerId: string]: number;
};

export type ValidationResult = {
    isValid: boolean;
    score: number;
};

export interface Game {
    gameCode: string;
    gameState: GameState;
    players: Player[];
    categories: string[];
    totalRounds: number;
    roundDuration: number;
    currentRound: number;
    currentLetter: string;
    usedLetters: string[];
    roundData: RoundData;
    lastRoundScores?: RoundScores;
    roundValidation?: { [playerId: string]: { [category: string]: ValidationResult } };
    aiError?: string;
}