"use strict";

let audioContext;

async function beep() {
  audioContext ||= new AudioContext();
  if (audioContext.state === "suspended") await audioContext.resume();

  const start = audioContext.currentTime + 0.01;
  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, start);
  oscillator.frequency.exponentialRampToValueAtTime(660, start + 0.2);

  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(0.14, start + 0.025);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);

  oscillator.connect(volume);
  volume.connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.36);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "PLAY_SOUND") return false;
  beep().then(
    () => sendResponse({ok: true}),
    error => {
      console.error("Could not play sound:", error);
      sendResponse({ok: false, error: String(error)});
    }
  );
  return true;
});

