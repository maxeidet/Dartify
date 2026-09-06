import { DartThrow, Segment, Multiplier } from '../../core/types';

// Measurements in mm for a standard sisal dartboard
const BOARD_RADIUS_MM = 170; // Outer edge of the double wire
const RINGS = {
  DOUBLE_BULL: 12.7 / BOARD_RADIUS_MM,
  OUTER_BULL: 31.8 / BOARD_RADIUS_MM,
  TREBLE_INNER: 99.0 / BOARD_RADIUS_MM,
  TREBLE_OUTER: 107.0 / BOARD_RADIUS_MM,
  DOUBLE_INNER: 162.0 / BOARD_RADIUS_MM,
  DOUBLE_OUTER: 170.0 / BOARD_RADIUS_MM, // which is 1.0
};

// Clockwise from top
const SEGMENTS: Segment[] = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5
];

export interface PixelCoords {
  x: number;
  y: number;
}

/**
 * Given a point in the homography-transformed image (where the board is a perfect square),
 * computes the score.
 * 
 * @param point The tip of the dart in the normalized board image.
 * @param boardSize The size of the normalized board image (e.g., 1000 for a 1000x1000 image).
 */
export function calculateScore(point: PixelCoords, boardSize: number): DartThrow {
  const cx = boardSize / 2;
  const cy = boardSize / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;
  
  // Convert to polar coords
  // By doing atan2(dx, -dy), 0 degrees is at the top (dy is negative), and it increases clockwise.
  let angleRad = Math.atan2(dx, -dy);
  let angleDeg = angleRad * (180 / Math.PI);
  angleDeg = (angleDeg + 360) % 360; // Normalize to [0, 360)

  // Distance from center
  const pixelRadius = Math.sqrt(dx * dx + dy * dy);
  const normalizedRadius = pixelRadius / (boardSize / 2);

  // Determine multiplier and segment overrides (bullseyes)
  let multiplier: Multiplier = 1;
  let segment: Segment = 0;

  if (normalizedRadius > RINGS.DOUBLE_OUTER) {
    // Miss
    segment = 0;
    multiplier = 1;
  } else if (normalizedRadius <= RINGS.DOUBLE_BULL) {
    // Inner Bull
    segment = 25;
    multiplier = 2;
  } else if (normalizedRadius <= RINGS.OUTER_BULL) {
    // Outer Bull
    segment = 25;
    multiplier = 1;
  } else {
    // Standard segment (1-20)
    // Shift by 9 degrees so that the 20 segment goes from [0, 18] degrees instead of [-9, 9]
    const shiftedAngle = (angleDeg + 9) % 360;
    const segmentIndex = Math.floor(shiftedAngle / 18);
    segment = SEGMENTS[segmentIndex];

    if (normalizedRadius >= RINGS.TREBLE_INNER && normalizedRadius <= RINGS.TREBLE_OUTER) {
      multiplier = 3;
    } else if (normalizedRadius >= RINGS.DOUBLE_INNER && normalizedRadius <= RINGS.DOUBLE_OUTER) {
      multiplier = 2;
    } else {
      multiplier = 1;
    }
  }

  return {
    segment,
    multiplier,
    boardPoint: { x: point.x, y: point.y } // Useful for debugging or overlaying
  };
}

/**
 * Utility: Transforms a pixel coordinate using a homography matrix.
 * OpenCV usually gives us a 3x3 matrix (or a cv.Mat which we can extract to a 1D array).
 * This function applies that perspective transform to a single point.
 * 
 * @param srcPoint The original (x, y) point in the camera stream.
 * @param hMatrix A 3x3 perspective transform matrix (flattened as a 9-element array).
 * @returns The transformed (x, y) coordinate on the normalized board image.
 */
export function applyHomography(srcPoint: PixelCoords, hMatrix: number[]): PixelCoords {
  const x = srcPoint.x;
  const y = srcPoint.y;

  const w = hMatrix[6] * x + hMatrix[7] * y + hMatrix[8];
  
  if (w === 0) return { x: 0, y: 0 }; // Avoid division by zero

  const dstX = (hMatrix[0] * x + hMatrix[1] * y + hMatrix[2]) / w;
  const dstY = (hMatrix[3] * x + hMatrix[4] * y + hMatrix[5]) / w;

  return { x: dstX, y: dstY };
}
