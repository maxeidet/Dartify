// We'll assume the global `cv` object is available since it will be loaded via script tag in index.html.
declare const cv: any;

export interface MotionResult {
  hasMotion: boolean;
  deltaScore: number;
}

export class MotionDetector {
  private referenceFrame: any | null = null;
  private motionThreshold: number;
  private minContourArea: number;

  constructor(motionThreshold: number = 25, minContourArea: number = 500) {
    this.motionThreshold = motionThreshold;
    this.minContourArea = minContourArea;
  }

  /**
   * Set the reference frame (when the board is empty/stable)
   */
  public setReferenceFrame(frame: any) {
    if (this.referenceFrame) {
      this.referenceFrame.delete();
    }
    this.referenceFrame = new cv.Mat();
    // Convert to grayscale and blur to reduce noise
    cv.cvtColor(frame, this.referenceFrame, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(this.referenceFrame, this.referenceFrame, new cv.Size(21, 21), 0);
  }

  /**
   * Compare current frame to reference frame to detect movement (e.g. dart flying, person in frame)
   */
  public detect(frame: any): MotionResult {
    if (!this.referenceFrame) {
      return { hasMotion: false, deltaScore: 0 };
    }

    const currentGray = new cv.Mat();
    cv.cvtColor(frame, currentGray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(currentGray, currentGray, new cv.Size(21, 21), 0);

    const frameDelta = new cv.Mat();
    // Absolute difference between current frame and reference frame
    cv.absdiff(this.referenceFrame, currentGray, frameDelta);

    const thresh = new cv.Mat();
    // Threshold to make differences binary (black or white)
    cv.threshold(frameDelta, thresh, this.motionThreshold, 255, cv.THRESH_BINARY);
    
    // Dilate the thresholded image to fill in holes
    const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
    cv.dilate(thresh, thresh, kernel, new cv.Point(-1, -1), 2);

    // Calculate how many pixels have changed
    const nonZeroCount = cv.countNonZero(thresh);

    // Clean up temporary Mats to prevent memory leaks (OpenCV in JS requires manual memory management)
    currentGray.delete();
    frameDelta.delete();
    thresh.delete();
    kernel.delete();

    return {
      hasMotion: nonZeroCount > this.minContourArea,
      deltaScore: nonZeroCount
    };
  }

  public cleanup() {
    if (this.referenceFrame) {
      this.referenceFrame.delete();
      this.referenceFrame = null;
    }
  }
}
