// ---------- Voice dictation ----------
let activeRecognition = null;

export function stopActiveRecognition() {
  if (activeRecognition) {
    const r = activeRecognition;
    activeRecognition = null;
    r.abort();
  }
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

// Sets a form field's value programmatically and notifies listeners — some
// mobile browsers don't repaint a text field after a JS-only .value write
// until it's dispatched an input event (or the field gets focus/blur).
export function setValueAndNotify(el, value) {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// Single utterance -> one callback with the final transcript (e.g. dictate a title).
export function setupSingleShotMic(button, onResult) {
  const SR = getSpeechRecognition();
  if (!SR) {
    button.disabled = true;
    button.title = "Voice input isn't supported in this browser";
    return;
  }
  let recognition = null;

  function stopAndReset() {
    if (recognition) {
      const r = recognition;
      recognition = null;
      if (activeRecognition === r) activeRecognition = null;
      r.abort();
    }
    button.classList.remove("recording");
  }

  button.addEventListener("click", () => {
    if (recognition) {
      stopAndReset();
      return;
    }
    recognition = new SR();
    activeRecognition = recognition;
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.onresult = (e) => onResult(e.results[0][0].transcript.trim());
    recognition.onerror = stopAndReset;
    recognition.onend = stopAndReset;
    button.classList.add("recording");
    recognition.start();
  });
}

// Ongoing dictation -> one callback per completed sentence (e.g. narrate steps one by one).
export function setupContinuousMic(button, onFinal) {
  const SR = getSpeechRecognition();
  if (!SR) {
    button.disabled = true;
    button.title = "Voice input isn't supported in this browser";
    return;
  }
  let recognition = null;
  const originalLabel = button.textContent;

  function stopAndReset() {
    if (recognition) {
      const r = recognition;
      recognition = null;
      if (activeRecognition === r) activeRecognition = null;
      r.abort();
    }
    button.classList.remove("recording");
    button.textContent = originalLabel;
  }

  button.addEventListener("click", () => {
    if (recognition) {
      stopAndReset();
      return;
    }
    recognition = new SR();
    activeRecognition = recognition;
    recognition.lang = "en-GB";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) onFinal(e.results[i][0].transcript.trim());
      }
    };
    recognition.onerror = stopAndReset;
    recognition.onend = stopAndReset;
    button.classList.add("recording");
    button.textContent = "⏹ Stop";
    recognition.start();
  });
}

export function appendLine(textarea, line) {
  setValueAndNotify(textarea, textarea.value ? textarea.value + "\n" + line : line);
}
