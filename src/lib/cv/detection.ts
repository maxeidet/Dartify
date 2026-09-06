import { PixelCoords } from './geometry';

declare const cv: any;

/**
 * Compares two stable frames (before throw and after throw) to find the dart
 * and isolate the tip coordinates in the raw camera feed.
 */
export function extractDartTip(referenceFrame: any, currentFrame: any): PixelCoords | null {
  const refGray = new cv.Mat();
  const curGray = new cv.Mat();
  
  cv.cvtColor(referenceFrame, refGray, cv.COLOR_RGBA2GRAY);
  cv.cvtColor(currentFrame, curGray, cv.COLOR_RGBA2GRAY);
  
  // Slight blur to remove noise
  cv.GaussianBlur(refGray, refGray, new cv.Size(5, 5), 0);
  cv.GaussianBlur(curGray, curGray, new cv.Size(5, 5), 0);

  const diff = new cv.Mat();
  cv.absdiff(refGray, curGray, diff);

  const thresh = new cv.Mat();
  // We use a slightly higher threshold here to ensure we only get solid objects (the dart)
  cv.threshold(diff, thresh, 30, 255, cv.THRESH_BINARY);
  
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  let largestArea = 0;
  let largestContour = null;

  for (let i = 0; i < contours.size(); ++i) {
    const cnt = contours.get(i);
    const area = cv.contourArea(cnt);
    // Ignore small flecks of dust or lighting changes
    if (area > largestArea && area > 150) { 
      largestArea = area;
      largestContour = cnt;
    }
  }

  let tip: PixelCoords | null = null;

  if (largestContour) {
    // Tip Localization
    // Assuming the camera is placed *below* the dartboard pointing upwards.
    // The tip of the dart hitting the board will be the highest physical point on the dart body,
    // which corresponds to the smallest Y value in pixel coordinates.
    // (If the camera is above, you would want the largest Y value).
    
    let minY = Infinity;
    let tipX = 0;

    // Contour data is a 1D array of [x, y, x, y, ...]
    const pointsData = largestContour.data32S;
    for (let j = 0; j < pointsData.length; j += 2) {
      const x = pointsData[j];
      const y = pointsData[j + 1];
      if (y < minY) {
        minY = y;
        tipX = x;
      }
    }
    
    tip = { x: tipX, y: minY };
  }

  // Always delete OpenCV data structures
  refGray.delete();
  curGray.delete();
  diff.delete();
  thresh.delete();
  contours.delete();
  hierarchy.delete();

  return tip;
}
