export const GAMEPLAY_TILE = 64;
export const EDITOR_MINOR_CELL = 16;

export function gameplayTileSize(tileSize?: number): number {
  return tileSize && tileSize > 0 ? tileSize : GAMEPLAY_TILE;
}

export function placementCellSize(tileSize?: number): number {
  const tile = gameplayTileSize(tileSize);
  return Math.max(8, Math.round(tile / 4));
}

export function snapToPlacement(value: number, cellCount: number, tileSize: number): number {
  if (!cellCount) return Math.round(value);
  const unit = cellCount * placementCellSize(tileSize);
  return Math.round(value / unit) * unit;
}
