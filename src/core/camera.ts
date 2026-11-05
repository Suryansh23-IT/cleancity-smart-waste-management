export interface Point {
  x: number;
  y: number;
}
export function screenToWorld(
  p: Point,
  inverse: { a: number; b: number; c: number; d: number; e: number; f: number },
  bounds: { width: number; height: number },
): Point {
  return {
    x: Math.max(
      0,
      Math.min(bounds.width, inverse.a * p.x + inverse.c * p.y + inverse.e),
    ),
    y: Math.max(
      0,
      Math.min(bounds.height, inverse.b * p.x + inverse.d * p.y + inverse.f),
    ),
  };
}
export function panCamera(
  origin: Point,
  start: Point,
  current: Point,
  pixelsPerUnit: number,
): Point {
  return {
    x: origin.x - (current.x - start.x) / pixelsPerUnit,
    y: origin.y - (current.y - start.y) / pixelsPerUnit,
  };
}
