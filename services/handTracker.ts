
import { Point, HandData } from '../types';

declare var Hands: any;
declare var Camera: any;

export class HandTracker {
  private hands: any;
  private camera: any;
  private videoElement: HTMLVideoElement;
  private onResultsCallback: (data: HandData) => void;
  
  private prevX: number = 0.5;
  private prevY: number = 0.5;
  private smoothingFactor: number = 0.2;
  
  public pinchThreshold: number = 0.05;

  constructor(videoElement: HTMLVideoElement, onResults: (data: HandData) => void) {
    this.videoElement = videoElement;
    this.onResultsCallback = onResults;
    
    this.hands = new Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    this.hands.onResults(this.onResults.bind(this));
  }

  public async start() {
    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        await this.hands.send({ image: this.videoElement });
      },
      width: 640,
      height: 480
    });
    return this.camera.start();
  }

  public stop() {
    if (this.camera) this.camera.stop();
  }

  private onResults(results: any) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const indexTip = landmarks[8];
      const thumbTip = landmarks[4];
      
      const rawX = 1 - indexTip.x; 
      const rawY = indexTip.y;

      const smoothX = this.prevX + (rawX - this.prevX) * this.smoothingFactor;
      const smoothY = this.prevY + (rawY - this.prevY) * this.smoothingFactor;
      this.prevX = smoothX;
      this.prevY = smoothY;

      const dx = thumbTip.x - indexTip.x;
      const dy = thumbTip.y - indexTip.y;
      const dz = thumbTip.z - indexTip.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      const isFiring = distance < this.pinchThreshold;

      this.onResultsCallback({
        cursor: { x: smoothX, y: smoothY },
        isFiring: isFiring,
        handDetected: true,
        pinchDistance: distance
      });
    } else {
      this.onResultsCallback({
        cursor: { x: this.prevX, y: this.prevY },
        isFiring: false,
        handDetected: false,
        pinchDistance: 1.0
      });
    }
  }
}
