import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

let loaded = false;

export function loadEnvironment() {
  if (loaded) {
    return;
  }

  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFilePath);
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(currentDir, '../../.env'),
    path.resolve(currentDir, '../../../../.env')
  ];

  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      loaded = true;
      return;
    }
  }

  loaded = true;
}
