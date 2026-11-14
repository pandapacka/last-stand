export interface IsoPoint {
  x: number;
  y: number;
}

export interface IsoDiamond {
  top: IsoPoint;
  right: IsoPoint;
  bottom: IsoPoint;
  left: IsoPoint;
}

export interface IsoBox {
  left: number;
  top: number;
  width: number;
  height: number;
  bottomY: number;
  centerX: number;
}

export interface IsoProjection {
  originX: number;
  originY: number;
  cellW: number;
  cellH: number;
  worldW: number;
  worldH: number;
}

export function gridToScreen(proj: IsoProjection, gridX: number, gridY: number): IsoPoint {
  const hw = proj.cellW / 2;
  const hh = proj.cellH / 2;
  return {
    x: proj.originX + (gridX - gridY) * hw,
    y: proj.originY + (gridX + gridY) * hh,
  };
}

export function screenToGrid(proj: IsoProjection, screenX: number, screenY: number): IsoPoint {
  const hw = proj.cellW / 2;
  const hh = proj.cellH / 2;
  const a = (screenX - proj.originX) / hw;
  const b = (screenY - proj.originY) / hh;
  return {
    x: (a + b) / 2,
    y: (b - a) / 2,
  };
}

export function screenToCell(proj: IsoProjection, screenX: number, screenY: number): {
  x: number;
  y: number;
} {
  const g = screenToGrid(proj, screenX, screenY);
  return { x: Math.floor(g.x), y: Math.floor(g.y) };
}

export function cellDiamond(proj: IsoProjection, gridX: number, gridY: number): IsoDiamond {
  return {
    top: gridToScreen(proj, gridX, gridY),
    right: gridToScreen(proj, gridX + 1, gridY),
    bottom: gridToScreen(proj, gridX + 1, gridY + 1),
    left: gridToScreen(proj, gridX, gridY + 1),
  };
}

export function cellCenter(proj: IsoProjection, gridX: number, gridY: number): IsoPoint {
  const top = gridToScreen(proj, gridX, gridY);
  return { x: top.x, y: top.y + proj.cellH / 2 };
}

/** Painter's order: far (small gx+gy) first. */
export function isoSortKey(gridX: number, gridY: number, footprintH = 1): number {
  return (gridX + gridY + footprintH) * 20 + gridX;
}
