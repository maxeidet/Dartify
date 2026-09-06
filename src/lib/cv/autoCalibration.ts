import { PixelCoords } from './geometry';

declare const cv: any;

/**
 * Attempts to auto-detect the dartboard's outer circle (the double ring)
 * from a camera frame using OpenCV HoughCircles.
 *
 * @param frame An OpenCV Mat (RGBA) captured from the video stream.
 * @returns The detected circle's center and radius, or null if detection fails.
 */
export function detectBoardCircle(
  frame: any
): { center: PixelCoords; radius: number } | null {
  const gray = new cv.Mat();
  const blurred = new cv.Mat();

  try {
    // 1. Convert to grayscale
    cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY);

    // 2. Blur to reduce noise and prevent false circle detections
    cv.GaussianBlur(gray, blurred, new cv.Size(9, 9), 2);

    // 3. Detect circles using Hough Transform
    const circles = new cv.Mat();
    try {
      cv.HoughCircles(
        blurred,
        circles,
        cv.HOUGH_GRADIENT,
        1,                          // dp — accumulator resolution ratio
        gray.rows / 4,              // minDist — minimum distance between circle centers
        100,                        // param1 — upper Canny threshold
        40,                         // param2 — accumulator threshold (lower = more detections)
        Math.floor(gray.rows / 8),  // minRadius — reject tiny circles
        Math.floor(gray.rows / 2),  // maxRadius — reject circles bigger than half the frame
      );

      if (circles.cols === 0) {
        return null;
      }

      // 4. Pick the largest circle (most likely the outer double ring)
      let bestIdx = 0;
      let bestRadius = 0;
      for (let i = 0; i < circles.cols; i++) {
        const r = circles.floatAt(0, i * 3 + 2);
        if (r > bestRadius) {
          bestRadius = r;
          bestIdx = i;
        }
      }

      const cx = circles.floatAt(0, bestIdx * 3);
      const cy = circles.floatAt(0, bestIdx * 3 + 1);
      const radius = circles.floatAt(0, bestIdx * 3 + 2);

      return { center: { x: cx, y: cy }, radius };
    } finally {
      circles.delete();
    }
  } finally {
    gray.delete();
    blurred.delete();
  }
}

/**
 * Converts a detected circle (center + radius) into the 4 cardinal corner points
 * that the calibration matrix expects:
 *   [0] top-center    (12 o'clock — segment 20)
 *   [1] right-center  (3 o'clock)
 *   [2] bottom-center (6 o'clock)
 *   [3] left-center   (9 o'clock)
 *
 * These map to the corners of the output square in getCalibrationMatrix().
 */
export function circleToCorners(
  center: PixelCoords,
  radius: number,
): PixelCoords[] {
  return [
    { x: center.x, y: center.y - radius },         // Top
    { x: center.x + radius, y: center.y },          // Right
    { x: center.x, y: center.y + radius },          // Bottom
    { x: center.x - radius, y: center.y },          // Left
  ];
}
