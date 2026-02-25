// src/main.js
import { createUI } from './ui.js';

// Fetch questions and boot the UI
async function boot(){
  try {
    const res = await fetch('data/questions.json');
    const questions = await res.json();
    // Defensive: ensure questions sorted by id
    questions.sort((a,b)=> a.id - b.id);
    createUI({questions});
  } catch (e){
    console.error('Failed to load questions.json', e);
    document.body.innerHTML = '<div style="padding:40px;color:#fff">Failed to load questions. Make sure data/questions.json is present.</div>';
  }
}

boot();
