// Read-only reader for Wurm Unlimited *.map layers.
// Layout (verified on the Adventure world): 1024-byte header, then size*size
// little-endian uint32 tiles, row-major (index = y * size + x).
// Tile: low byte = tile type id, bits 16-31 = signed 16-bit height.
// Height in metres = signed value / 2560 (verified against item Z, median error 0.25 m).
import fs from 'node:fs';

export const HEADER_BYTES = 1024;

export function mapSize(fileBytes) {
  const size = Math.round(Math.sqrt((fileBytes - HEADER_BYTES) / 4));
  return size * size * 4 + HEADER_BYTES === fileBytes ? size : null;
}

export function decodeTile(raw) {
  const h = raw >>> 16;
  return { type: raw & 0xff, height: (h > 32767 ? h - 65536 : h) / 2560 };
}

export function readTile(file, x, y) {
  const size = mapSize(fs.statSync(file).size);
  if (!size) throw new Error('unrecognised map size');
  if (x < 0 || y < 0 || x >= size || y >= size) throw new RangeError('tile out of range');
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, HEADER_BYTES + (y * size + x) * 4);
    return decodeTile(buf.readUInt32LE(0));
  } finally {
    fs.closeSync(fd);
  }
}

export function tileFromPosition(posX, posY) {
  return { x: Math.floor(posX / 4), y: Math.floor(posY / 4) };
}
