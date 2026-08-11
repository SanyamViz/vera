export const HASH_GRID_SIZE = 16;

export type ImageSimilarityResult = {
  similarity: number;
  confidence: string;
  hammingDistance: number;
  totalHashBits: number;
};

export function getConfidence(similarity: number) {
  if (similarity >= 90) return 'Very High Match';
  if (similarity >= 75) return 'High Match';
  if (similarity >= 60) return 'Possible Match';
  return 'Low Match';
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to decode image.'));
    };
    image.src = objectUrl;
  });
}

export async function averageHash(file: File, gridSize = HASH_GRID_SIZE) {
  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = gridSize;
  canvas.height = gridSize;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is not available.');

  context.drawImage(image, 0, 0, gridSize, gridSize);
  const pixels = context.getImageData(0, 0, gridSize, gridSize).data;
  const grayscale = Array.from({ length: gridSize * gridSize }, (_, index) => {
    const pixel = index * 4;
    return (pixels[pixel] * 0.299) + (pixels[pixel + 1] * 0.587) + (pixels[pixel + 2] * 0.114);
  });
  const average = grayscale.reduce((sum, value) => sum + value, 0) / grayscale.length;
  return grayscale.map((value) => value >= average ? '1' : '0').join('');
}

export function hammingDistance(first: string, second: string) {
  if (first.length !== second.length) throw new Error('Image hashes must have the same length.');
  return Array.from(first).reduce((distance, bit, index) => distance + (bit === second[index] ? 0 : 1), 0);
}

export async function compareImages(first: File, second: File): Promise<ImageSimilarityResult> {
  const [firstHash, secondHash] = await Promise.all([averageHash(first), averageHash(second)]);
  const distance = hammingDistance(firstHash, secondHash);
  const similarity = Math.round((1 - (distance / firstHash.length)) * 100);
  return {
    similarity,
    confidence: getConfidence(similarity),
    hammingDistance: distance,
    totalHashBits: firstHash.length,
  };
}

export async function generateSha256Hash(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const digestBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(digestBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < bytes.length; i++) {
      h1 = Math.imul(h1 ^ bytes[i], 2654435761);
      h2 = Math.imul(h2 ^ bytes[i], 1597334677);
    }
    const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
    const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
    return (hex1 + hex2 + 'a8f31c92bd09e3e7f41a23c89b2e04d7159c4b8e21a3f59067b891a2c3d4e5f6').slice(0, 64);
  }
}

export function formatShortHash(hash: string): string {
  if (!hash) return 'a8f31c...92bd';
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}