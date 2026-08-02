// ---------- Voice dictation ----------
let activeRecognition = null;

export function stopActiveRecognition() {
  if (activeRecognition) {
    activeRecognition.stop();
    activeRecognition = null;
  }
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
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
  button.addEventListener("click", () => {
    if (recognition) {
      recognition.stop();
      return;
    }
    recognition = new SR();
    activeRecognition = recognition;
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.onresult = (e) => onResult(e.results[0][0].transcript.trim());
    recognition.onerror = () => {
      button.classList.remove("recording");
      recognition = null;
      activeRecognition = null;
    };
    recognition.onend = () => {
      button.classList.remove("recording");
      recognition = null;
      activeRecognition = null;
    };
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
  button.addEventListener("click", () => {
    if (recognition) {
      recognition.stop();
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
    recognition.onerror = () => {
      button.classList.remove("recording");
      button.textContent = originalLabel;
      recognition = null;
      activeRecognition = null;
    };
    recognition.onend = () => {
      button.classList.remove("recording");
      button.textContent = originalLabel;
      recognition = null;
      activeRecognition = null;
    };
    button.classList.add("recording");
    button.textContent = "⏹ Stop";
    recognition.start();
  });
}

export function appendLine(textarea, line) {
  textarea.value = textarea.value ? textarea.value + "\n" + line : line;
}
