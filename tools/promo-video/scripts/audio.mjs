// Original score: "A place for the thought", 92 BPM, A minor.
// All oscillators, envelopes, percussion and UI cues are generated here. MIT.
import fs from 'node:fs/promises';
import path from 'node:path';
import { root } from './lib.mjs';
const rate = 48000, seconds = 95, n = rate * seconds, beat = 60 / 92;
const left = new Float32Array(n), right = new Float32Array(n);
const tau = Math.PI * 2;
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
function add(start, length, fn, gain = 1, pan = 0) {
  const offset = Math.floor(start * rate), count = Math.floor(length * rate);
  const l = Math.sqrt((1 - pan) / 2) * gain, r = Math.sqrt((1 + pan) / 2) * gain;
  for (let i = 0; i < count && offset + i < n; i++) {
    if (offset + i < 0) continue;
    const value = fn(i / rate, i / count);
    left[offset + i] += value * l; right[offset + i] += value * r;
  }
}
let seed = 806;
const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 2147483648 - 1; };
const chords = [[57, 60, 64, 71], [53, 57, 60, 67], [48, 55, 60, 64], [55, 59, 62, 69]];
for (let bar = 0; bar < 37; bar++) {
  const start = bar * beat * 4, chord = chords[bar % 4];
  if (start >= seconds) break;
  for (let j = 0; j < chord.length; j++) {
    const f = hz(chord[j]);
    add(start, beat * 5, (t, p) => (Math.sin(tau * f * t) + .18 * Math.sin(tau * f * 2.001 * t)) * Math.min(1, t / .7) * (1 - p) ** 1.8, .042, (j - 1.5) * .4);
  }
  add(start, beat * 3.6, (t, p) => Math.sin(tau * hz(chord[0] - 12) * t) * Math.min(1, t / .025) * (1 - p) ** 1.8, .12);
  for (let step = 0; step < 8; step++) {
    const f = hz(chord[[0, 2, 1, 3, 2, 1, 3, 2][step]] + 12);
    add(start + step * beat / 2, .7, (t) => (Math.sin(tau * f * t) + .15 * Math.sin(tau * f * 3 * t)) * Math.min(1, t / .009) * Math.exp(-t * 7), .041, Math.sin(step * 1.3) * .55);
  }
  if (start > 7 && start < 87) {
    for (let b = 0; b < 4; b++) {
      add(start + b * beat, .22, t => Math.sin(tau * (49 * t + 8 * (1 - Math.exp(-32 * t)))) * Math.exp(-t * 22), .15);
      add(start + b * beat + beat / 2, .055, t => noise() * Math.exp(-t * 80), .019, b % 2 ? -.35 : .35);
      if (b % 2) add(start + b * beat, .1, t => noise() * Math.exp(-t * 45) + .2 * Math.sin(tau * 180 * t) * Math.exp(-t * 28), .035);
    }
  }
}
for (const start of [8, 17, 30, 41, 55, 65, 79, 88]) {
  add(start - .28, .65, (t, p) => noise() * Math.sin(Math.PI * p) ** 3 * .45 + Math.sin(tau * (240 * t + 220 * t * t)) * Math.exp(-t * 10), .048, -.25);
}
for (const start of [24.1, 26.3, 32, 34, 36.6, 43.1, 46.4, 48.6, 68, 71, 74.2, 77, 88.5]) {
  [76, 83].forEach((note, i) => add(start + i * .07, .6, t => Math.sin(tau * hz(note) * t) * Math.min(1, t / .005) * Math.exp(-t * 9), .048, i ? .25 : -.25));
}
const wav = Buffer.alloc(44 + n * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 4, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 4, 40);
let peak = 0;
for (let i = 0; i < n; i++) {
  const t = i / rate;
  const fade = Math.min(1, t / 2, (seconds - t) / 2.2);
  const l = Math.tanh(left[i] * 1.5) * fade, r = Math.tanh(right[i] * 1.5) * fade;
  peak = Math.max(peak, Math.abs(l), Math.abs(r));
  wav.writeInt16LE(Math.round(l * 32760), 44 + i * 4); wav.writeInt16LE(Math.round(r * 32760), 46 + i * 4);
}
await fs.mkdir(path.join(root, 'assets/audio'), { recursive: true });
await fs.writeFile(path.join(root, 'assets/audio/score.wav'), wav);
console.log(`Original 95s stereo score + synchronized Foley generated; peak ${20 * Math.log10(peak)} dBFS.`);
