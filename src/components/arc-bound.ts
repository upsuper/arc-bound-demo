export interface Point {
  x: number,
  y: number,
}

interface Vector {
  x: number,
  y: number,
}

export interface Rect {
  left: number,
  right: number,
  top: number,
  bottom: number,
}

export interface Arc {
  start: Point,
  end: Point,
  rx: number,
  ry: number,
  rotation: number, // degree
  largeArc: boolean,
  sweep: boolean,
}

export interface ArcAlt {
  phi: number,
  rx: number,
  ry: number,
  cx: number,
  cy: number,
  theta1: number,
  dtheta: number,
}

export function convertArcParams(arc: Arc): ArcAlt {
  // Many parts of computation below are based on corresponding sections
  // of Implementation Notes in https://www.w3.org/TR/SVG/implnote.html

  let { rx, ry, rotation } = arc;
  const { start: { x: x1, y: y1 }, end: { x: x2, y: y2 } } = arc;
  const { largeArc, sweep } = arc;
  const phi = rotation % 180 / 180 * Math.PI;
  const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);

  // Without radii, it's just line segment.
  if (rx == 0 || ry == 0) {
    return {
      phi, rx, ry,
      cx: (x1 + x2) / 2,
      cy: (y1 + y2) / 2,
      theta1: 0,
      dtheta: Math.PI,
    };
  }

  // Correction of out-of-range radii.
  // This section is based on B.2.5 in the Implementation Notes.
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const dx2 = (x1 - x2) / 2, dy2 = (y1 - y2) / 2;
  // x_1', y_1'
  const x1p = cosPhi * dx2 + sinPhi * dy2, y1p = -sinPhi * dx2 + cosPhi * dy2;
  // x_1'^2, y_1'^2
  const x1p2 = x1p * x1p, y1p2 = y1p * y1p;
  const sqrtLambda = Math.sqrt(x1p2 / (rx * rx) + y1p2 / (ry * ry));
  if (sqrtLambda > 1) {
    rx = sqrtLambda * rx;
    ry = sqrtLambda * ry;
  }

  // Compute the center of the ellipse.
  // This section is based on B.2.4 in the Implementation Notes.
  // rx^2, ry^2
  const rx2 = rx * rx, ry2 = ry * ry;
  // The correction of radii above theoretically ensures this expression
  // is never below zero, but there can be floating number computation
  // errors, so we clamp it with zero to avoid generating NaN.
  const cFactorA = Math.max(0, rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2);
  const cFactor = Math.sqrt(cFactorA / (rx2 * y1p2 + ry2 * x1p2)) * (largeArc === sweep ? -1 : 1);
  // c_x', c_y'
  const cxp = cFactor * rx * y1p / ry, cyp = -cFactor * ry * x1p / rx;
  // c_x, c_y
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2, cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  // Compute the start angle and the delta angle between start and end.
  // This section is also based on B.2.4 in the Implementation Notes.
  const vec1 = { x: (x1p - cxp) / rx, y: (y1p - cyp) / ry };
  const vec2 = { x: (-x1p - cxp) / rx, y: (-y1p - cyp) / ry };
  const theta1 = angle({ x: 1, y: 0 }, vec1);
  let dtheta = angle(vec1, vec2);
  if (!sweep && dtheta > 0) {
    dtheta -= 2 * Math.PI;
  } else if (sweep && dtheta < 0) {
    dtheta += 2 * Math.PI;
  }
  return { phi, rx, ry, cx, cy, theta1, dtheta };
}

export function arcBound(arc: Arc): Rect {
  const { start: { x: x1, y: y1 }, end: { x: x2, y: y2 } } = arc;
  if (arc.rx == 0 || arc.ry == 0 || (x1 == x2 && y1 == y2)) {
    return {
      left: Math.min(x1, x2),
      right: Math.max(x1, x2),
      top: Math.min(y1, y2),
      bottom: Math.max(y1, y2),
    };
  }

  // Compute the angles when x or y reaches maxima or minima on
  // the ellipse.
  //
  // Proof:
  //  Given the center parameterization, we have
  //  > x = r_x cos(phi) cos(theta) - r_y sin(phi) sin(theta) + c_x
  //  in which theta is the angle on the ellipse. Then we have
  //  > dx / dtheta = -r_x cos(phi) sin(theta) - r_y sin(phi) cos(theta)
  //  when dx / dtheta = 0, we have
  //  > -r_x cos(phi) sin(theta) = r_y sin(phi) cos(theta)
  //  when cos(phi) is not 0, we have
  //  > tan(theta) = -r_y / r_x * tan(phi)
  //  When theta meets this equation, x would be maxima or minima.
  //
  //  Similarly, when sin(phi) is not 0,
  //  > tan(theta) = r_y / r_x / tan(phi)
  //  for maxima and minima of y.
  //
  // Note: since JavaScript produces `Infinity` for 1 / 0, and
  // `Math.atan(Infinity)` returns pi / 2, we can rely on the above
  // formulas without special-casing those cases.
  const { phi, rx, ry, cx, cy, theta1, dtheta } = convertArcParams(arc);
  const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);
  const tanPhi = sinPhi / cosPhi;
  const thetaExtremaX = Math.atan(-ry / rx * tanPhi);
  const thetaExtremaY = Math.atan(ry / rx / tanPhi);
  // Possible extremas include the start and end points, as well as the
  // points where the derivative reaches zero.
  let maybeExtremaXs = [x1, x2], maybeExtremaYs = [y1, y2];
  for (const offset of [-2 * Math.PI, -Math.PI, 0, Math.PI, 2 * Math.PI]) {
    const thetaX = thetaExtremaX + offset, thetaY = thetaExtremaY + offset;
    const ratioX = (thetaX - theta1) / dtheta, ratioY = (thetaY - theta1) / dtheta;
    if (ratioX > 0 && ratioX < 1) {
      maybeExtremaXs.push(rx * cosPhi * Math.cos(thetaX) - ry * sinPhi * Math.sin(thetaX) + cx);
    }
    if (ratioY > 0 && ratioY < 1) {
      maybeExtremaYs.push(rx * sinPhi * Math.cos(thetaY) + ry * cosPhi * Math.sin(thetaY) + cy);
    }
  }
  return {
    left: Math.min(...maybeExtremaXs),
    right: Math.max(...maybeExtremaXs),
    top: Math.min(...maybeExtremaYs),
    bottom: Math.max(...maybeExtremaYs),
  };
}

function norm(v: Vector): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

// Returns a number in radian in [-pi, pi]
function angle(u: Vector, v: Vector): number {
  const product = u.x * v.x + u.y * v.y;
  const sign = u.x * v.y - u.y * v.x < 0 ? -1 : 1;
  return sign * Math.acos(product / (norm(u) * norm(v)));
}
