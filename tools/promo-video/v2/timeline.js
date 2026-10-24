export const duration = 32;
export const fps = 30;
export const bpm = 120;
export const beat = 60 / bpm;
export const scenes = [
  { start: 0, end: 3, name: 'Ideas move fast', mode: 'paper' },
  { start: 3, end: 7, name: 'Meet Hazlo', mode: 'slate' },
  { start: 7, end: 12, name: 'Speak it. Or type it.', mode: 'paper' },
  { start: 12, end: 17, name: 'Thoughts become tasks', mode: 'paper' },
  { start: 17, end: 22, name: 'Capture locally. Sync to Notion.', mode: 'dark' },
  { start: 22, end: 26, name: 'Your setup. Your workspace.', mode: 'paper' },
  { start: 26, end: 32, name: 'Build your own Hazlo', mode: 'dark' },
];
export const captions = [
  [0.15, 1.4, 'Your ideas move fast.'],
  [1.5, 2.95, 'Your task capture should too.'],
  [3.15, 6.85, 'Meet Hazlo. Voice-first task capture.'],
  [7.15, 8.45, 'Speak it.'],
  [8.5, 11.85, 'Or type it.'],
  [12.15, 16.85, 'Thoughts become tasks. Local, rule-based extraction.'],
  [17.15, 19.85, 'Capture locally. Sync to Notion.'],
  [20, 21.85, 'Local entries stay available when sync fails.'],
  [22.1, 25.85, 'Your setup. Your workspace. Fork, connect, configure, deploy.'],
  [26.1, 28.25, 'Build your own Hazlo.'],
  [28.5, 31.9, 'Open source. Forkable. Yours. Built by Kaushik.'],
];
// Shared edit/score markers, in seconds: downbeats, half-beat UI accents and final resolve.
export const accents = [0, 0.5, 1.5, 2.5, 3, 4.5, 5.5, 7, 8.5, 9, 10.5, 11.5, 12, 13, 13.5, 14.5, 15.5, 17, 18, 18.5, 19, 19.5, 20.5, 22, 22.5, 23.25, 24, 24.75, 26, 27, 28.5, 30.5, 31.5];
