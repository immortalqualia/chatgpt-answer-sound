(() => {
  "use strict";

  // DOM ChatGPT, проверенный через Playwriter 10.11.2026:
  // #app-shell-sidebar [data-sidebar-cycle-item][aria-label]
  // data-sidebar-indicator="working" + [role="status"][aria-label="Выполняется"]
  const SIDEBAR_SELECTOR = "#app-shell-sidebar";
  const ROW_SELECTOR = "[data-sidebar-cycle-item][aria-label]";
  const FINISH_DELAY_MS = 500;

  // ID диалога -> последнее известное состояние; при старте не уведомляем.
  const states = new Map();
  let observer;
  let scanScheduled = false;

  function visibleThreads() {
    const sidebar = document.querySelector(SIDEBAR_SELECTOR);
    if (!sidebar) return [];

    const threads = [];
    for (const row of sidebar.querySelectorAll(ROW_SELECTOR)) {
      const anchor = row.querySelector('a[href^="/c/"]');
      if (!anchor) continue;

      const id = new URL(anchor.href).pathname;
      if (!/^\/c\/[a-z0-9-]+$/i.test(id)) continue;

      threads.push({
        id,
        title: row.getAttribute("aria-label") || anchor.textContent.trim(),
        working: row.getAttribute("data-sidebar-indicator") === "working"
      });
    }
    return threads;
  }

  function scheduleConfirmation(thread, state) {
    state.pending = setTimeout(() => {
      state.pending = null;
      const current = visibleThreads().find(item => item.id === thread.id);
      if (!current || current.working) return;

      state.working = false;
      chrome.runtime.sendMessage({
        type: "CHAT_FINISHED",
        chatId: thread.id,
        title: current.title
      }).catch(() => {
        // Страница может закрыться, когда сообщение отправляется.
      });
    }, FINISH_DELAY_MS);
  }

  function scan() {
    for (const thread of visibleThreads()) {
      const state = states.get(thread.id);

      // Только наблюдаемые переходы, не состояние при загрузке.
      if (!state) {
        states.set(thread.id, {working: thread.working, pending: null});
        continue;
      }

      if (thread.working) {
        if (state.pending !== null) {
          clearTimeout(state.pending);
          state.pending = null;
        }
        state.working = true;
      } else if (state.working && state.pending === null) {
        scheduleConfirmation(thread, state);
      }
    }
  }

  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    queueMicrotask(() => {
      scanScheduled = false;
      scan();
    });
  }

  function attach(sidebar) {
    scan(); // фиксируем исходное состояние без уведомлений
    observer = new MutationObserver(scheduleScan);
    observer.observe(sidebar, {
      subtree: true,
      childList: true, // React может пересоздавать строку вместо изменения атрибута
      attributes: true,
      attributeFilter: ["data-sidebar-indicator", "href"]
    });
  }

  const sidebar = document.querySelector(SIDEBAR_SELECTOR);
  if (sidebar) {
    attach(sidebar);
  } else {
    // Для страницы, где боковая панель монтируется позже content script.
    const onMount = new MutationObserver(() => {
      const mounted = document.querySelector(SIDEBAR_SELECTOR);
      if (!mounted) return;
      onMount.disconnect();
      attach(mounted);
    });
    onMount.observe(document.documentElement, {subtree: true, childList: true});
  }
})();
