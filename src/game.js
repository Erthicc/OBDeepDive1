// src/game.js
// Encapsulates the Game rules and state.
// Public API: Game(options) -> instance with methods listed below.

export class Game {
  constructor({questions, onStateChange=null} = {}) {
    // Immutable questions array (50 items)
    this.questions = questions || [];
    // Game state
    this.state = {
      year: 1, // 1..25
      questionIndexInYear: 0, // 0 or 1
      globalQuestionIndex: 0, // 0..49 used to pick question from questions[]
      money: 0,
      health: 100, // 0..100
      answeredThisYearCorrectCount: 0,
      isOver: false,
      lastYearSummary: null
    };
    this.onStateChange = onStateChange;
    this.maxYears = 25;
    this._notify();
  }

  _notify(){
    if(typeof this.onStateChange === 'function') this.onStateChange(this.state);
  }

  // Reset to initial state and optionally keep same question set
  reset(){
    this.state = {
      year: 1,
      questionIndexInYear: 0,
      globalQuestionIndex: 0,
      money: 0,
      health: 100,
      answeredThisYearCorrectCount: 0,
      isOver: false,
      lastYearSummary: null
    };
    this._save();
    this._notify();
  }

  // Save/load to localStorage so player can resume
  _storageKey(){ return 'survive_scale_v1'; }
  _save(){
    try {
      localStorage.setItem(this._storageKey(), JSON.stringify(this.state));
    } catch(e){ console.warn('Save failed', e) }
  }
  load(){
    try {
      const raw = localStorage.getItem(this._storageKey());
      if(raw){
        const parsed = JSON.parse(raw);
        // keep only known keys (simple safety)
        Object.keys(this.state).forEach(k => { if(parsed[k] !== undefined) this.state[k] = parsed[k]; });
        this._notify();
      }
    } catch(e){ console.warn('Load failed', e) }
  }

  // Return current question object
  currentQuestion(){
    return this.questions[this.state.globalQuestionIndex] || null;
  }

  // Money increment formula per year (year starts at 1)
  yearlyIncrement(year){
    const base = 1_000_000_000;
    return Math.round(base * Math.pow(1.07, year));
  }

  // Answer API: call with selected option index; returns {correct,gameOver,summaryIfYearEnded}
  answer(optionIndex){
    if(this.state.isOver) return {error:'game over'};
    const q = this.currentQuestion();
    if(!q) return {error:'no question'};
    const correct = optionIndex === q.correctIndex;

    // Immediate update for wrong answers: subtract 50 health per wrong
    if(!correct){
      this.state.health -= 50;
      if(this.state.health < 0) this.state.health = 0;
    } else {
      this.state.answeredThisYearCorrectCount += 1;
    }

    // Move indices
    const lastQuestionIndexInYear = this.state.questionIndexInYear === 1;
    // increment global/random
    this.state.globalQuestionIndex += 1;
    this.state.questionIndexInYear = lastQuestionIndexInYear ? 0 : 1;

    let summary = null;

    if(!correct && this.state.health <= 0){
      // Bankruptcy immediate
      this.state.isOver = true;
      this.state.lastYearSummary = {
        year: this.state.year,
        bankrupt:true,
        moneyGained:0,
        health:this.state.health,
        reason:'health <= 0 after wrong answer'
      };
      this._save();
      this._notify();
      return {correct:false, gameOver:true, summary:this.state.lastYearSummary};
    }

    // If we've finished the year's two questions, apply end-of-year rules
    if(lastQuestionIndexInYear){
      // Determine earned money this year
      let moneyGained = 0;
      if(this.state.answeredThisYearCorrectCount === 2){
        moneyGained = this.yearlyIncrement(this.state.year);
        this.state.money += moneyGained;
        // Health increases by 10, capped at 100
        this.state.health = Math.min(100, this.state.health + 10);
      } else if(this.state.answeredThisYearCorrectCount === 1){
        // Earns nothing; health already reduced by 50 during the wrong answer
      } else {
        // answeredThisYearCorrectCount === 0 -> both wrong; ensure bankrupt
        this.state.health = Math.max(0, this.state.health - 0); // already applied per wrong
        if(this.state.health <= 0){
          this.state.isOver = true;
        }
      }

      // Prepare summary reported to UI
      summary = {
        year: this.state.year,
        correctThisYear: this.state.answeredThisYearCorrectCount,
        moneyGained,
        totalMoney: this.state.money,
        health: this.state.health,
        bankrupt: this.state.isOver
      };

      this.state.lastYearSummary = summary;

      // advance year if not over
      if(!this.state.isOver){
        this.state.year += 1;
        if(this.state.year > this.maxYears){
          // Player wins — survived all years
          this.state.isOver = true;
        }
        // reset for next year
        this.state.answeredThisYearCorrectCount = 0;
      }

      this._save();
      this._notify();
      return {correct, gameOver:this.state.isOver, summary};
    }

    // Not end of year yet — just save and continue
    this._save();
    this._notify();
    return {correct, gameOver:false};
  }

  // helper checks
  hasWon(){
    return this.state.isOver && this.state.year > this.maxYears;
  }

  hasLost(){
    return this.state.isOver && this.state.health <= 0;
  }

  // simple convenience functions for UI
  getProgressText(){
    return `Year ${this.state.year} of ${this.maxYears}`;
  }
}
