// src/ui.js
import { Game } from './game.js';

export function createUI({questions}) {
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

  function formatMoney(n){
    // Friendly compact format
    if(n >= 1_000_000_000){
      return `$${(n/1_000_000_000).toFixed(2)}B`;
    } else if(n >= 1_000_000){
      return `$${(n/1_000_000).toFixed(2)}M`;
    }
    return `$${n.toLocaleString()}`;
  }

  function renderState(state){
    // UI updates
    const fill = Math.max(0, Math.min(100, state.health));
    healthFill.style.transform = `scaleX(${fill/100})`;
    if(fill > 60){
      healthFill.style.background = 'linear-gradient(90deg,#16a34a,#f59e0b)';
    } else {
      healthFill.style.background = 'linear-gradient(90deg,#f59e0b,#dc2626)';
    }
    healthText.textContent = `${fill}%`;
    moneyText.textContent = formatMoney(state.money);
    yearText.textContent = `Year ${state.year} of 25`;
    progressText.textContent = `Progress: Year ${state.year} • Questions answered ${state.globalQuestionIndex} / ${questions.length}`;

    // If game over, show end modal
    if(state.isOver){
      showEnd(state);
    }
  }

  // Show question modal for current question
  function showCurrentQuestion(){
    const q = game.currentQuestion();
    if(!q) {
      // no questions left
      return;
    }
    qYear.textContent = `Year ${q.year}`;
    const qInYear = ( (game.state.questionIndexInYear === 0) ? 1 : 2 );
    qNumber.textContent = `Question ${qInYear} of 2`;
    qTitle.textContent = q.text;
    explanationEl.classList.add('hidden');
    explanationEl.textContent = '';

    // build options
    optionsWrap.innerHTML = '';
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'optionBtn';
      btn.textContent = opt;
      btn.addEventListener('click', async () => {
        // disable options to prevent double clicks
        Array.from(optionsWrap.querySelectorAll('button')).forEach(b=>b.disabled=true);
        const result = game.answer(idx);
        if(result.correct){
          btn.classList.add('correct');
        } else {
          btn.classList.add('wrong');
        }
        // show explanation if available
        if(q.explanation){
          explanationEl.textContent = q.explanation;
          explanationEl.classList.remove('hidden');
        }
        // if the year just ended, show summary after a short pause
        if(result.summary){
          setTimeout(()=> {
            hideElement(questionModal);
            showSummary(result.summary);
          }, 900);
        } else {
          // allow next question to be shown immediately
          setTimeout(()=> {
            // proceed to next question modal if not finished
            if(!result.gameOver){
              hideElement(questionModal);
              // show next question (if any)
              setTimeout(()=> showCurrentQuestion(), 300);
            }
          }, 700);
        }
      });
      optionsWrap.appendChild(btn);
    });

    showElement(questionModal);
    // Focus the first option for accessibility
    const firstBtn = optionsWrap.querySelector('button');
    if(firstBtn) firstBtn.focus();
  }

  function showSummary(summary){
    summaryBody.innerHTML = `
      <p><strong>Year ${summary.year} summary</strong></p>
      <p>Correct answers this year: ${summary.correctThisYear} / 2</p>
      <p>Money gained this year: ${formatMoney(summary.moneyGained || 0)}</p>
      <p>Company health: ${summary.health}%</p>
      ${summary.bankrupt ? '<p style="color: #ff9999"><strong>Bankrupt!</strong></p>' : ''}
    `;
    showElement(summaryModal);
  }

  function showEnd(state){
    if(game.hasWon()){
      endTitle.textContent = 'You Win — Company Survived!';
      endBody.innerHTML = `<p>Congratulations — you survived ${game.maxYears} years.</p><p>Final money: ${formatMoney(state.money)}</p><p>Final health: ${state.health}%</p>`;
    } else if(game.hasLost()){
      endTitle.textContent = 'Bankrupt — Game Over';
      endBody.innerHTML = `<p>Your company went bankrupt in year ${state.year}.</p><p>Final money: ${formatMoney(state.money)}</p><p>Final health: ${state.health}%</p>`;
    } else {
      endTitle.textContent = 'Game Over';
      endBody.innerHTML = `<p>Final money: ${formatMoney(state.money)}</p><p>Final health: ${state.health}%</p>`;
    }
    showElement(endModal);
  }

  // helpers
  function showElement(el){ el.classList.remove('hidden'); }
  function hideElement(el){ el.classList.add('hidden'); }

  // Wire buttons
  startBtn.addEventListener('click', ()=> {
    hideElement(endModal);
    hideElement(summaryModal);
    // If there are still questions left and not over, start at current
    if(game.state.isOver){
      // Game over: show final; allow reset or play again
      showEnd(game.state);
      return;
    }
    showCurrentQuestion();
  });

  resetBtn.addEventListener('click', ()=>{
    if(confirm('Reset the game? This will clear saved progress.')){
      game.reset();
      hideElement(questionModal);
      hideElement(summaryModal);
      hideElement(endModal);
    }
  });

  continueBtn.addEventListener('click', ()=>{
    hideElement(summaryModal);
    // If game ended due to surviving all years, show end
    if(game.state.isOver){
      showEnd(game.state);
    } else {
      // show next question if available
      setTimeout(()=> showCurrentQuestion(), 200);
    }
  });

  playAgainBtn.addEventListener('click', ()=>{
    game.reset();
    hideElement(endModal);
  });

  // initial render
  renderState(game.state);

  // expose for console debugging
  return {game};
}
