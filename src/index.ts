import { Citation } from './utils/citation';
import { GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, 'assets');
const fontFile = path.join(dataDir, 'BMmini.ttf');
const logo = path.join(dataDir, 'logo.png');

if (!fs.existsSync(dataDir)) throw new Error(`${dataDir} is no where to be found`);
if (!fs.existsSync(fontFile)) throw new Error(`Font ${fontFile} is no where to be found`);
if (!fs.existsSync(logo)) throw new Error(`Logo ${logo} is no where to be found`);

GlobalFonts.registerFromPath(path.join(__dirname, 'assets', 'BMmini.ttf'), 'BMmini');

export { Citation }