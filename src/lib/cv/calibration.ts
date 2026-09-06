import { PixelCoords } from './geometry';

declare const cv: any;

/**
 * Computes the homography (perspective transform) matrix given 4 corners 
 * of the dartboard from the raw camera image.
 * 
 * @param corners The 4 points tapped by the user (top-left, top-right, bottom-right, bottom-left)
 * @param boardPixelSize The size of the normalized output square (e.g., 1000 for 1000x1000)
 * @returns An array of 9 numbers representing the 3x3 transformation matrix
 */
export function getCalibrationMatrix(corners: PixelCoords[], boardPixelSize: number): number[] {
  if (corners.length !== 4) {
    throw new Error("Exactly 4 corners are required for calibration.");
  }

  // Source points (from camera stream, warped)
  const srcCoords = [
    corners[0].x, corners[0].y,
    corners[1].x, corners[1].y,
    corners[2].x, corners[2].y,
    corners[3].x, corners[3].y
  ];
  const srcMat = cv.matFromArray(4, 1, cv.CV_32FC2, srcCoords);

  // Destination points (perfect square)
  // We map the outer double ring to the edges of the square
  const dstCoords = [
    0, 0,                             // Top-left
    boardPixelSize, 0,                // Top-right
    boardPixelSize, boardPixelSize,   // Bottom-right
    0, boardPixelSize                 // Bottom-left
  ];
  const dstMat = cv.matFromArray(4, 1, cv.CV_32FC2, dstCoords);

  // Calculate Perspective Transform
  const transformMat = cv.getPerspectiveTransform(srcMat, dstMat);

  // Extract values to a standard JS array so we don't have to keep the cv.Mat in state
  const hMatrix: number[] = [];
  for (let i = 0; i < 9; i++) {
    hMatrix.push(transformMat.doublePtr(0, i)[0]);
  }

  // Cleanup OpenCV memory
  srcMat.delete();
  dstMat.delete();
  transformMat.delete();

  return hMatrix;
}
