import fs from 'fs';
import path from 'path';

export function getUploadsRoot() {
  return path.resolve(process.cwd(), 'uploads');
}

export function ensureUploadsDir(...segments: string[]) {
  const dir = path.resolve(getUploadsRoot(), ...segments);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function toPublicUploadPath(...segments: string[]) {
  return `/uploads/${segments.map((segment) => segment.replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/')}`;
}
