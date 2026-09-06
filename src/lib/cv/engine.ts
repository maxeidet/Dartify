import { MotionDetector } from './motion';
import { extractDartTip } from './detection';
import { calculateScore, applyHomography, PixelCoords } from './geometry';
import { DartThrow } from '../../core/types';

export enum EngineState {
  UNINITIALIZED = 'UNINITIALIZED',
  CALIBRATING = 'CALIBRATING',
  IDLE = 'IDLE',
  MOTION = 'MOTION',
  SCORING = 'SCORING',
  WAITING_REMOVAL = 'WAITING_REMOVAL'
}

export interface EngineConfig {
  boardPixelSize?: number;
  motionThreshold?: number;
  minContourArea?: number;
  onStateChange?: (state: EngineState) => void;
  onDartDetected?: (throwData: DartThrow) => void;
}

export class AutoscoringEngine {
  public state: EngineState = EngineState.UNINITIALIZED;
  private config: EngineConfig;
  private motionDetector: MotionDetector;
  
  private videoElement: HTMLVideoElement | null = null;
  private hiddenCanvas: HTMLCanvasElement;
  private hiddenCtx: CanvasRenderingContext2D;
  
  private animationFrameId: number = 0;
  private homographyMatrix: number[] | null = null;

  // Variables to debounce motion to idle
  private idleFramesCounter: number = 0;
  private readonly STABLE_FRAMES_REQUIRED = 15; // Wait roughly half a second of no-motion before scoring

  // OpenCV Mats created dynamically from canvas
  private currentCvFrame: any = null;
  private referenceCvFrame: any = null;

  constructor(config: EngineConfig = {}) {
    this.config = {
      boardPixelSize: 1000,
      motionThreshold: 25,
      minContourArea: 150,
      ...config
    };

    this.motionDetector = new MotionDetector(
      this.config.motionThreshold, 
      this.config.minContourArea
    );

    this.hiddenCanvas = document.createElement('canvas');
    this.hiddenCtx = this.hiddenCanvas.getContext('2d', { willReadFrequently: true })!;
  }

  public setVideoSource(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
    // Set canvas to match video dimensions once loaded
    this.hiddenCanvas.width = videoElement.videoWidth || 640;
    this.hiddenCanvas.height = videoElement.videoHeight || 480;
  }

  public setCalibration(hMatrix: number[]) {
    this.homographyMatrix = hMatrix;
    this.transitionTo(EngineState.IDLE);
    this.captureReferenceFrame();
  }

  public start() {
    if (!this.videoElement) throw new Error("Video source not set");
    if (this.state === EngineState.UNINITIALIZED) {
      this.transitionTo(EngineState.CALIBRATING);
    }
    this.loop();
  }

  public stop() {
    cancelAnimationFrame(this.animationFrameId);
    this.motionDetector.cleanup();
    if (this.currentCvFrame) this.currentCvFrame.delete();
    if (this.referenceCvFrame) this.referenceCvFrame.delete();
  }
  
  public resetToIdle() {
    this.transitionTo(EngineState.IDLE);
    this.captureReferenceFrame();
  }

  private transitionTo(newState: EngineState) {
    this.state = newState;
    if (this.config.onStateChange) {
      this.config.onStateChange(newState);
    }
  }

  private captureReferenceFrame() {
    if (!this.videoElement) return;
    this.hiddenCtx.drawImage(this.videoElement, 0, 0, this.hiddenCanvas.width, this.hiddenCanvas.height);
    const imageData = this.hiddenCtx.getImageData(0, 0, this.hiddenCanvas.width, this.hiddenCanvas.height);
    
    if (this.referenceCvFrame) this.referenceCvFrame.delete();
    // @ts-ignore global cv
    this.referenceCvFrame = cv.matFromImageData(imageData);
    this.motionDetector.setReferenceFrame(this.referenceCvFrame);
  }

  private captureCurrentFrame(): any {
    this.hiddenCtx.drawImage(this.videoElement!, 0, 0, this.hiddenCanvas.width, this.hiddenCanvas.height);
    const imageData = this.hiddenCtx.getImageData(0, 0, this.hiddenCanvas.width, this.hiddenCanvas.height);
    // @ts-ignore global cv
    const frame = cv.matFromImageData(imageData);
    return frame;
  }

  private loop = () => {
    // Only process if OpenCV is loaded and video is playing
    // @ts-ignore
    if (typeof cv !== 'undefined' && this.videoElement && this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
      
      // Dynamically update canvas size if device rotates or stream changes
      if (this.hiddenCanvas.width !== this.videoElement.videoWidth) {
        this.hiddenCanvas.width = this.videoElement.videoWidth;
        this.hiddenCanvas.height = this.videoElement.videoHeight;
        if (this.state !== EngineState.CALIBRATING && this.state !== EngineState.UNINITIALIZED) {
            this.captureReferenceFrame();
        }
      }

      this.processFrame();
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private processFrame() {
    if (this.state === EngineState.CALIBRATING || this.state === EngineState.UNINITIALIZED) {
      return; // Do nothing until calibrated
    }

    const currentFrame = this.captureCurrentFrame();
    const motion = this.motionDetector.detect(currentFrame);

    if (this.state === EngineState.IDLE) {
      if (motion.hasMotion) {
        // Someone threw a dart or walked in front of the camera
        this.transitionTo(EngineState.MOTION);
        this.idleFramesCounter = 0;
      }
    } else if (this.state === EngineState.MOTION) {
      if (!motion.hasMotion) {
        this.idleFramesCounter++;
        if (this.idleFramesCounter > this.STABLE_FRAMES_REQUIRED) {
          // Motion has fully stopped. We assume a dart has landed and settled.
          this.transitionTo(EngineState.SCORING);
          this.scoreFrame(currentFrame);
        }
      } else {
        // Motion is still happening, reset the counter
        this.idleFramesCounter = 0;
      }
    }

    currentFrame.delete();
  }

  private scoreFrame(currentFrame: any) {
    if (!this.homographyMatrix || !this.referenceCvFrame) return;

    // 1. Find tip in raw camera coords
    const tipRaw = extractDartTip(this.referenceCvFrame, currentFrame);

    if (tipRaw) {
      // 2. Map to perfectly square board coords
      const tipNormalized = applyHomography(tipRaw, this.homographyMatrix);
      
      // 3. Score it
      const throwData = calculateScore(tipNormalized, this.config.boardPixelSize!);
      
      // Append raw coords for debugging overlay in the UI if needed
      throwData.boardPoint = tipNormalized;
      (throwData as any).rawPoint = tipRaw; 

      if (this.config.onDartDetected) {
        this.config.onDartDetected(throwData);
      }
    }

    // Wait for the user to remove darts or confirm score
    this.transitionTo(EngineState.WAITING_REMOVAL);
  }
}
