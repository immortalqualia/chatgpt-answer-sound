"use strict";

// Запросы из разных вкладок обрабатываем последовательно.
let queue = Promise.resolve();
let creatingOffscreen = null;

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;

  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Play a short sound when an answer in ChatGPT finishes."
    }).finally(() => {
      creatingOffscreen = null;
    });
  }
  await creatingOffscreen;
}

async function playSound() {
  await ensureOffscreen();
  const reply = await chrome.runtime.sendMessage({type: "PLAY_SOUND"});
  if (!reply?.ok) throw new Error(reply?.error || "No acknowledgement from audio document");
}

async function handleMessage(message) {
  if (message.type === "TEST_SOUND") {
    await playSound();
    return;
  }
  if (message.type !== "CHAT_FINISHED") return;

  const {enabled} = await chrome.storage.local.get({enabled: true});
  if (!enabled) return;

  const chatId = message.chatId;
  if (typeof chatId !== "string" || !/^\/c\/[a-z0-9-]+$/i.test(chatId)) return;

  const now = Date.now();
  const {recentSounds = {}} = await chrome.storage.session.get("recentSounds");
  // Одна генерация, замеченная несколькими вкладками, даёт один звук.
  if (now - (recentSounds[chatId] || 0) < 2500) return;

  for (const [id, timestamp] of Object.entries(recentSounds)) {
    if (now - timestamp > 10000) delete recentSounds[id];
  }
  recentSounds[chatId] = now;
  await chrome.storage.session.set({recentSounds});
  await playSound();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "CHAT_FINISHED" && message?.type !== "TEST_SOUND") {
    return false;
  }
  queue = queue.catch(() => {}).then(() => handleMessage(message));
  queue.then(
    () => sendResponse({ok: true}),
    error => {
      console.error("ChatGPT sound extension:", error);
      sendResponse({ok: false, error: String(error)});
    }
  );
  return true;
});

