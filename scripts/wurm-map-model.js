export class TerrainLayer {
  constructor({
    type,
    name,
    tags = [],
    dataByte = 0,
    data = dataByte,
    height,
    heightDm = 0,
    ceiling,
    ceilingDm = null,
  }) {
    this.type = type;
    this.name = name;
    this.tags = [...tags];
    this.dataByte = dataByte;
    this.heightDm = heightDm;
    this.height = height ?? heightDm / 10;
    this.data = data;
    this.ceilingDm = ceilingDm;
    this.ceiling = ceiling ?? (ceilingDm === null ? null : ceilingDm / 10);
  }
}

export class MapTile {
  constructor({ x, y, surface, rock, cave, resources, flags }) {
    this.x = x;
    this.y = y;
    this.surface = surface instanceof TerrainLayer ? surface : new TerrainLayer(surface);
    this.rock = rock instanceof TerrainLayer ? rock : new TerrainLayer(rock);
    this.cave = cave instanceof TerrainLayer ? cave : new TerrainLayer(cave);
    this.resources = resources;
    this.flags = flags;
  }

  cornerAltitudes(neighbors) {
    const corners = (layer) => {
      const height = (tile) => (tile ? tile[layer].height : null);
      return {
        northWest: height(this),
        northEast: height(neighbors.east),
        southWest: height(neighbors.south),
        southEast: height(neighbors.southEast),
      };
    };
    return { surface: corners('surface'), rock: corners('rock') };
  }
}

export class MapSnapshot {
  constructor({ id, world, playerId, playerName, centerX, centerY, radius, bounds, createdAt }) {
    Object.assign(this, {
      id,
      world,
      playerId,
      playerName,
      centerX,
      centerY,
      radius,
      bounds,
      createdAt,
    });
  }
}
