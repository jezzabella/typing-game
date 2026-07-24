// Typing Race — asset-driven build.
// Game logic stays; visual layer is driven by PNGs in /assets.
(() => {
  const STATES = ["start","name","level","race","results","share"];
  const viewport = document.getElementById("viewport");
  const scenes = Object.fromEntries(
    STATES.map(s => [s, document.querySelector(`.scene[data-state="${s}"]`)])
  );

  const state = {
    current:"start", name:"JESS", level:"medium",
    prompt:"", typed:"", errors:0, started:0, timerId:null,
    wpm:0, acc:100, elapsed:0, place:"1st", levelIdx:1,
  };

  const PROMPTS = {
    easy:   "the quick fox jumps over the lazy dog near the red track today",
    medium: "crazy frederick bought many very exquisite opal jewels",
    hard:   "pixelated racers accelerate when precision meets velocity; mistakes cost you valuable milliseconds",
  };

  function go(next){
    state.current = next;
    viewport.dataset.state = next;
    for (const s of STATES) scenes[s].hidden = (s !== next);
    onEnter[next] && onEnter[next]();
  }

  const onEnter = {
    start(){ positionRacers(0,0); },
    name(){ setTimeout(()=>document.getElementById("nameInput").focus(), 30); },
    level(){ updateLevelSelection(); },
    race(){ startRace(); },
    results(){ fillResults(); positionRacersFinish(); },
    share(){ fillShare(); },
  };

  const racerP = document.getElementById("racerPlayer");
  const racerC = document.getElementById("racerCpu");
  function positionRacers(pPct, cPct){
    // Track usable travel inside the reference roughly 6% -> 58% of viewport.
    const start=6, end=58;
    racerP.style.left = (start + pPct*(end-start)) + "%";
    racerC.style.left = (start + cPct*(end-start)) + "%";
  }
  function positionRacersFinish(){
    racerP.style.left = "80%";
    racerC.style.left = "76%";
  }

  // ---------- global keyboard routing ----------
  document.addEventListener("keydown", (e) => {
    if (state.current === "start" && e.code === "Space"){ e.preventDefault(); go("name"); return; }
    if (state.current === "name"){
      if (e.key === "Enter"){
        const v = document.getElementById("nameInput").value.trim().toUpperCase();
        state.name = v || "PLAYER";
        go("level");
      }
      return;
    }
    if (state.current === "level"){
      const levels = ["easy","medium","hard"];
      if (e.key === "ArrowRight" || e.key === "ArrowDown"){ state.levelIdx=(state.levelIdx+1)%3; updateLevelSelection(); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp"){ state.levelIdx=(state.levelIdx+2)%3; updateLevelSelection(); }
      else if (e.key === "Enter" || e.code === "Space"){ state.level = levels[state.levelIdx]; go("race"); }
      return;
    }
    if (state.current === "race"){ handleRaceKey(e); return; }
    if (state.current === "results" && e.code === "Space"){ e.preventDefault(); go("race"); return; }
    if (state.current === "share" && e.code === "Space"){ e.preventDefault(); go("race"); return; }
  });

  // ---------- level click + selection outline ----------
  document.querySelectorAll(".level-btn").forEach(b => {
    b.addEventListener("click", () => {
      state.levelIdx = ["easy","medium","hard"].indexOf(b.dataset.level);
      state.level = b.dataset.level;
      go("race");
    });
  });
  function updateLevelSelection(){
    const levels = ["easy","medium","hard"];
    document.querySelectorAll(".level-btn").forEach(b => {
      b.classList.toggle("is-selected", b.dataset.level === levels[state.levelIdx]);
    });
  }

  // ---------- race ----------
  function startRace(){
    state.prompt = PROMPTS[state.level];
    state.typed  = "";
    state.errors = 0;
    state.started = performance.now();
    state.elapsed = 0;
    renderPrompt();
    positionRacers(0,0);
    clearInterval(state.timerId);
    state.timerId = setInterval(tickRace, 100);
  }
  function tickRace(){
    state.elapsed = (performance.now() - state.started)/1000;
    const cpuCps = { easy:2.0, medium:3.2, hard:4.5 }[state.level];
    const cpuProg = Math.min(1, (state.elapsed * cpuCps) / state.prompt.length);
    const pProg = state.typed.length / state.prompt.length;
    positionRacers(pProg, cpuProg);

    const minutes = state.elapsed/60 || 1e-6;
    state.wpm = Math.round((state.typed.length/5) / minutes);
    const total = state.typed.length + state.errors;
    state.acc = total ? Math.round((state.typed.length/total)*100) : 100;

    document.getElementById("hudWpm").textContent = "WPM " + state.wpm;
    document.getElementById("hudAcc").textContent = "ACC " + state.acc + "%";
    document.getElementById("hudTime").textContent = state.elapsed.toFixed(1) + "s";

    if (pProg >= 1 || cpuProg >= 1){
      state.place = pProg >= 1 && pProg >= cpuProg ? "1st" : "2nd";
      clearInterval(state.timerId);
      setTimeout(()=>go("results"), 400);
    }
  }
  function handleRaceKey(e){
    if (e.key.length === 1){
      e.preventDefault();
      const expect = state.prompt[state.typed.length];
      if (e.key === expect) state.typed += e.key; else state.errors++;
      renderPrompt();
    } else if (e.key === "Backspace"){
      e.preventDefault();
      state.typed = state.typed.slice(0,-1);
      renderPrompt();
    }
  }
  function renderPrompt(){
    const p = state.prompt, t = state.typed;
    let html = "";
    for (let i=0;i<p.length;i++){
      const ch = p[i];
      if (ch === " "){
        if (i < t.length) html += " ";
        else if (i === t.length) html += `<span class="cur">\u00a0</span>`;
        else html += " ";
      } else if (i < t.length) html += `<span class="ok">${ch}</span>`;
      else if (i === t.length) html += `<span class="cur">${ch}</span>`;
      else html += ch;
    }
    document.getElementById("promptText").innerHTML = html;
  }

  // ---------- results ----------
  function fillResults(){
    document.getElementById("rWpm").textContent = state.wpm || 0;
  }
  document.getElementById("btnShare").addEventListener("click", () => go("share"));

  // ---------- share ----------
  function fillShare(){
    document.getElementById("sName").textContent = state.name;
    document.getElementById("sWpm").textContent = state.wpm || 0;
  }

  go("start");
})();
