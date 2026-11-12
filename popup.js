"use strict";

const enabled = document.getElementById("enabled");
const status = document.getElementById("status");
const test = document.getElementById("test");

chrome.storage.local.get({enabled: true}).then(settings => {
  enabled.checked = settings.enabled;
});

enabled.addEventListener("change", async () => {
  await chrome.storage.local.set({enabled: enabled.checked});
  status.textContent = enabled.checked ? "Уведомления включены" : "Уведомления выключены";
});

test.addEventListener("click", async () => {
  status.textContent = "Проверка…";
  try {
    const reply = await chrome.runtime.sendMessage({type: "TEST_SOUND"});
    status.textContent = reply?.ok ? "Сигнал отправлен" : ("Ошибка: " + (reply?.error || "нет ответа"));
  } catch (error) {
    status.textContent = "Ошибка: " + error.message;
  }
});
