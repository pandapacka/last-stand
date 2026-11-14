type Aabb = {x:number;y:number;w:number;h:number};
type CollisionRect = {ox:number;oy:number;w:number;h:number};
export function worldCollisionAabb(
  entityX: number,
  entityY: number,
  col: CollisionRect,
): Aabb {
  return { x: entityX + col.ox, y: entityY + col.oy, w: col.w, h: col.h };
}

function aabbOverlap(a: Aabb, b: Aabb): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function overlapArea(a: Aabb, b: Aabb): number {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (ox <= 0 || oy <= 0) return 0;
  return ox * oy;
}

function asRects(moving: CollisionRect | CollisionRect[]): CollisionRect[] {
  return Array.isArray(moving) ? moving.filter((r) => r.w > 0 && r.h > 0) : [moving];
}

function overlappingPairs(
  x: number,
  y: number,
  moving: CollisionRect[],
  obstacles: Aabb[],
): Array<{ box: Aabb; hit: Aabb; area: number }> {
  const out: Array<{ box: Aabb; hit: Aabb; area: number }> = [];
  for (const r of moving) {
    const box = worldCollisionAabb(x, y, r);
    for (const o of obstacles) {
      if (!aabbOverlap(box, o)) continue;
      out.push({ box, hit: o, area: overlapArea(box, o) });
    }
  }
  out.sort((a, b) => b.area - a.area);
  return out;
}

export function placementWouldOverlap(
  entityX: number,
  entityY: number,
  movingCol: CollisionRect | CollisionRect[],
  obstacles: Aabb[],
): boolean {
  return overlappingPairs(entityX, entityY, asRects(movingCol), obstacles).length > 0;
}
