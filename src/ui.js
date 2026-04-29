// src/ui.js
import { Game } from './game.js';

export function createUI({ questions }) {
  // DOM refs
  const healthFill = document.getElementById('healthFill');
  const healthText = document.getElementById('healthText');
  const moneyText = document.getElementById('moneyText');
  const yearText = document.getElementById('yearText');
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const progressText = document.getElementById('progressText');

  const questionModal = document.getElementById('questionModal');
  const qYear = document.getElementById('qYear');
  const qNumber = document.getElementById('qNumber');
  const qTitle = document.getElementById('qTitle');
  const optionsWrap = document.getElementById('options');
  const explanationEl = document.getElementById('explanation');
  const nextBtn = document.getElementById('nextBtn');

  const summaryModal = document.getElementById('summaryModal');
  const summaryBody = document.getElementById('summaryBody');
  const continueBtn = document.getElementById('continueBtn');

  const endModal = document.getElementById('endModal');
  const endTitle = document.getElementById('endTitle');
  const endBody = document.getElementById('endBody');
  const playAgainBtn = document.getElementById('playAgainBtn');

  let game = new Game({
    questions,
    onStateChange: renderState
  });

  // Attempt to load previous state
  game.load();

  function formatMoney(n) {
    if (n >= 1_000_000_000) {
      return `$${(n / 1_000_000_000).toFixed(2)}B`;
    } else if (n >= 1_000_000) {
      return `$${(n / 1_000_000).toFixed(2)}M`;
    }
    return `$${n.toLocaleString()}`;
  }

  function applyOptionStyles(btn) {
    btn.style.display = 'block';
    btn.style.width = '100%';
    btn.style.padding = '16px 18px';
    btn.style.margin = '0';
    btn.style.borderRadius = '12px';
    btn.style.border = '2px solid #cbd5e1';
    btn.style.background = '#ffffff';
    btn.style.color = '#0f172a';
    btn.style.fontSize = '1.05rem';
    btn.style.fontWeight = '700';
    btn.style.lineHeight = '1.4';
    btn.style.textAlign = 'left';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
    btn.style.transition = 'transform 0.12s ease, background 0.12s ease, border-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease';
    btn.style.outline = 'none';
    btn.style.letterSpacing = '0.1px';
  }

  function setDisabledOptionStyle(btn) {
    btn.style.cursor = 'not-allowed';
    btn.style.opacity = '0.92';
  }

  function renderState(state) {
    const fill = Math.max(0, Math.min(100, state.health));
    healthFill.style.transform = `scaleX(${fill / 100})`;

    if (fill > 60) {
      healthFill.style.background = 'linear-gradient(90deg,#16a34a,#f59e0b)';
    } else {
      healthFill.style.background = 'linear-gradient(90deg,#f59e0b,#dc2626)';
    }

    healthText.textContent = `${fill}%`;
    moneyText.textContent = formatMoney(state.money);
    yearText.textContent = `Year ${state.year} of 25`;
    progressText.textContent = `Progress: Year ${state.year} • Questions answered ${state.globalQuestionIndex} / ${questions.length}`;

    if (state.isOver) {
      showEnd(state);
    }
  }

  function showCurrentQuestion() {
    const q = game.currentQuestion();
    if (!q) return;

    qYear.textContent = `Year ${q.year}`;
    const qInYear = game.state.questionIndexInYear === 0 ? 1 : 2;
    qNumber.textContent = `Question ${qInYear} of 2`;
    qTitle.textContent = q.text;

    explanationEl.classList.add('hidden');
    explanationEl.textContent = '';

    optionsWrap.innerHTML = '';
    optionsWrap.style.display = 'grid';
    optionsWrap.style.gap = '12px';

    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'optionBtn';
      btn.textContent = opt;

      applyOptionStyles(btn);

      btn.addEventListener('mouseenter', () => {
        if (!btn.disabled) {
          btn.style.transform = 'translateY(-1px)';
          btn.style.background = '#f8fafc';
          btn.style.borderColor = '#94a3b8';
          btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.16)';
        }
      });

      btn.addEventListener('mouseleave', () => {
        if (!btn.disabled) {
          btn.style.transform = 'translateY(0)';
          btn.style.background = '#ffffff';
          btn.style.borderColor = '#cbd5e1';
          btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
        }
      });

      btn.addEventListener('click', async () => {
        Array.from(optionsWrap.querySelectorAll('button')).forEach((b) => {
          b.disabled = true;
          setDisabledOptionStyle(b);
        });

        const result = game.answer(idx);

        if (result.correct) {
          btn.style.background = '#dcfce7';
          btn.style.borderColor = '#22c55e';
          btn.style.color = '#14532d';
        } else {
          btn.style.background = '#fee2e2';
          btn.style.borderColor = '#ef4444';
          btn.style.color = '#7f1d1d';
        }

        if (q.explanation) {
          explanationEl.textContent = q.explanation;
          explanationEl.classList.remove('hidden');
        }

        if (result.summary) {
          setTimeout(() => {
            hideElement(questionModal);
            showSummary(result.summary);
          }, 900);
        } else {
          setTimeout(() => {
            if (!result.gameOver) {
              hideElement(questionModal);
              setTimeout(() => showCurrentQuestion(), 300);
            }
          }, 700);
        }
      });

      optionsWrap.appendChild(btn);
    });

    showElement(questionModal);

    const firstBtn = optionsWrap.querySelector('button');
    if (firstBtn) firstBtn.focus();
  }

  function showSummary(summary) {
    summaryBody.innerHTML = `
      <p><strong>Year ${summary.year} summary</strong></p>
      <p>Correct answers this year: ${summary.correctThisYear} / 2</p>
      <p>Money gained this year: ${formatMoney(summary.moneyGained || 0)}</p>
      <p>Company health: ${summary.health}%</p>
      ${summary.bankrupt ? '<p style="color: #ff9999"><strong>Bankrupt!</strong></p>' : ''}
    `;
    showElement(summaryModal);
  }

  function showEnd(state) {
    if (game.hasWon()) {
      endTitle.textContent = 'You Win — Company Survived!';
      endBody.innerHTML = `<p>Congratulations — you survived ${game.maxYears} years.</p><p>Final money: ${formatMoney(state.money)}</p><p>Final health: ${state.health}%</p>`;
    } else if (game.hasLost()) {
      endTitle.textContent = 'Bankrupt — Game Over';
      endBody.innerHTML = `<p>Your company went bankrupt in year ${state.year}.</p><p>Final money: ${formatMoney(state.money)}</p><p>Final health: ${state.health}%</p>`;
    } else {
      endTitle.textContent = 'Game Over';
      endBody.innerHTML = `<p>Final money: ${formatMoney(state.money)}</p><p>Final health: ${state.health}%</p>`;
    }
    showElement(endModal);
  }

  function showElement(el) {
    el.classList.remove('hidden');
  }

  function hideElement(el) {
    el.classList.add('hidden');
  }

  startBtn.addEventListener('click', () => {
    hideElement(endModal);
    hideElement(summaryModal);

    if (game.state.isOver) {
      showEnd(game.state);
      return;
    }

    showCurrentQuestion();
  });

  resetBtn.addEventListener('click', () => {
    if (confirm('Reset the game? This will clear saved progress.')) {
      game.reset();
      hideElement(questionModal);
      hideElement(summaryModal);
      hideElement(endModal);
    }
  });

  continueBtn.addEventListener('click', () => {
    hideElement(summaryModal);

    if (game.state.isOver) {
      showEnd(game.state);
    } else {
      setTimeout(() => showCurrentQuestion(), 200);
    }
  });

  playAgainBtn.addEventListener('click', () => {
    game.reset();
    hideElement(endModal);
  });

  // initial render
  renderState(game.state);

  // expose for console debugging
  return { game };
}
