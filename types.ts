
export interface Point {
  x: number;
  y: number;
}

export interface Target {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  speedX: number;
  speedY: number;
  points: number;
  type: 'normal' | 'bonus' | 'hazard';
}

export enum GameStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface HandData {
  cursor: Point;
  isFiring: boolean;
  handDetected: boolean;
  pinchDistance: number;
}
