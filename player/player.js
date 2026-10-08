// Player interativo da composição HyperFrames.
// O vídeo (index.html) continua 100% determinístico para o render;
// toda interação vive aqui e só existe no navegador.

const CHAPTERS = [
  { t: 0, name: "janela" },
  { t: 3, name: "passo" },
  { t: 5, name: "olhares" },
  { t: 7.6, name: "encontro", meet: true },
  { t: 9.8, name: "cenario" },
  { t: 12.4, name: "final" },
];

const frame = document.getElementById("comp");
const wrap = document.getElementById("frame-wrap");
const btnPlay = document.getElementById("btn-play");
const btnRestart = document.getElementById("btn-restart");
const track = document.getElementById("track");
const fill = document.getElementById("fill");
const knob = document.getElementById("knob");
const chaptersEl = document.getElementById("chapters");

function fit() {
  const s = Math.min((innerWidth - 32) / 1080, (innerHeight - 84 - 32) / 1920);
  document.documentElement.style.setProperty("--scale", Math.max(0.1, s).toFixed(4));
}
addEventListener("resize", fit);
fit();

frame.addEventListener("load", () => {
  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  const tryInit = () => (win.gsap && win.__timelines?.main ? init(win, doc) : setTimeout(tryInit, 50));
  tryInit();
});

function init(win, doc) {
  const gsap = win.gsap;
  const tl = win.__timelines.main;
  const DUR = 15;
  const root = doc.getElementById("root");
  const bg = doc.getElementById("bg");
  const mid = doc.getElementById("mid");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Zonas clicáveis passam a receber ponteiro (no render elas são só divs vazias)
  const style = doc.createElement("style");
  style.textContent = `
    .hotspot { pointer-events: auto; cursor: pointer; }
    #root { cursor: crosshair; }
    .ix { position: absolute; pointer-events: none; border-radius: 50%; mix-blend-mode: screen; }
  `;
  doc.head.appendChild(style);

  // ---------- reprodução em loop ----------
  tl.eventCallback("onComplete", () => tl.restart());
  tl.play(0);
  wrap.classList.add("ready");

  const setPlaying = (on) => {
    on ? tl.play() : tl.pause();
    btnPlay.classList.toggle("paused", !on);
  };
  btnPlay.onclick = () => setPlaying(tl.paused());
  btnRestart.onclick = () => {
    tl.restart();
    setPlaying(true);
  };

  // ---------- linha do tempo com capítulos ----------
  CHAPTERS.forEach((c) => {
    const dot = document.createElement("span");
    dot.className = "chapter" + (c.meet ? " meet" : "");
    dot.style.left = (c.t / DUR) * 100 + "%";
    chaptersEl.appendChild(dot);
  });

  let scrubbing = false;
  let wasPlaying = true;
  const seekFromEvent = (e) => {
    const r = track.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    let t = f * DUR;
    // ímã nos capítulos
    for (const c of CHAPTERS) if (Math.abs(c.t - t) < 0.25) t = c.t;
    tl.seek(t, false);
  };
  track.addEventListener("pointerdown", (e) => {
    scrubbing = true;
    wasPlaying = !tl.paused();
    tl.pause();
    track.setPointerCapture(e.pointerId);
    seekFromEvent(e);
  });
  track.addEventListener("pointermove", (e) => scrubbing && seekFromEvent(e));
  track.addEventListener("pointerup", () => {
    scrubbing = false;
    setPlaying(wasPlaying);
  });

  const tick = () => {
    const p = (tl.time() / DUR) * 100;
    fill.style.width = p + "%";
    knob.style.left = p + "%";
    track.setAttribute("aria-valuenow", tl.time().toFixed(1));
    requestAnimationFrame(tick);
  };
  tick();

  // ---------- teclado ----------
  const onKey = (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      setPlaying(tl.paused());
    } else if (e.code === "ArrowRight") tl.seek(Math.min(DUR - 0.01, tl.time() + 1.5));
    else if (e.code === "ArrowLeft") tl.seek(Math.max(0, tl.time() - 1.5));
    else if (e.key === "e" || e.key === "E") jumpTo(5.9);
    else if (/^[1-6]$/.test(e.key)) tl.seek(CHAPTERS[+e.key - 1].t);
  };
  addEventListener("keydown", onKey);
  doc.addEventListener("keydown", onKey);

  // ---------- profundidade: cada plano segue o ponteiro em velocidades diferentes ----------
  const planes = [
    ["#par-bg", 14],
    ["#par-mid", 30],
    ["#par-fg", 80],
  ].map(([sel, amp]) => {
    const el = doc.querySelector(sel);
    return {
      amp,
      x: gsap.quickTo(el, "x", { duration: 1.1, ease: "power3.out" }),
      y: gsap.quickTo(el, "y", { duration: 1.1, ease: "power3.out" }),
      r: gsap.quickTo(el, "rotationY", { duration: 1.4, ease: "power3.out" }),
    };
  });
  gsap.set(["#par-bg", "#par-mid", "#par-fg"].map((s) => doc.querySelector(s)), { transformPerspective: 1600 });

  // luz que acompanha o ponteiro
  const spot = doc.createElement("div");
  spot.className = "ix";
  Object.assign(spot.style, {
    left: "0px",
    top: "0px",
    width: "700px",
    height: "700px",
    marginLeft: "-350px",
    marginTop: "-350px",
    background: "radial-gradient(circle, rgba(255,226,180,.32) 0%, rgba(255,180,120,.12) 35%, rgba(255,160,110,0) 65%)",
    opacity: "0",
  });
  root.insertBefore(spot, doc.getElementById("grade"));
  const spotX = gsap.quickTo(spot, "x", { duration: 0.6, ease: "power3.out" });
  const spotY = gsap.quickTo(spot, "y", { duration: 0.6, ease: "power3.out" });

  const lean = (nx, ny) => {
    if (reduce) return;
    planes.forEach((p) => {
      p.x(-nx * p.amp);
      p.y(-ny * p.amp);
      p.r(nx * 2.2);
    });
  };
  doc.addEventListener("pointermove", (e) => {
    const nx = e.clientX / 1080 - 0.5;
    const ny = e.clientY / 1920 - 0.5;
    lean(nx, ny);
    spotX(e.clientX);
    spotY(e.clientY);
    gsap.to(spot, { opacity: 1, duration: 0.4, overwrite: "auto" });
  });
  doc.addEventListener("pointerleave", () => {
    lean(0, 0);
    gsap.to(spot, { opacity: 0, duration: 0.8, overwrite: "auto" });
  });
  // celular: inclinar o aparelho também mexe a profundidade
  addEventListener("deviceorientation", (e) => {
    if (e.gamma == null) return;
    lean(Math.max(-1, Math.min(1, e.gamma / 30)) * 0.5, Math.max(-1, Math.min(1, (e.beta - 45) / 30)) * 0.5);
  });

  // ---------- efeitos de toque ----------
  const ripple = (x, y, color = "255,226,180", size = 1) => {
    const ring = doc.createElement("div");
    ring.className = "ix";
    Object.assign(ring.style, {
      left: x + "px",
      top: y + "px",
      width: "120px",
      height: "120px",
      marginLeft: "-60px",
      marginTop: "-60px",
      border: `3px solid rgba(${color},.9)`,
      boxShadow: `0 0 30px rgba(${color},.8), inset 0 0 20px rgba(${color},.5)`,
    });
    root.appendChild(ring);
    gsap.fromTo(ring, { scale: 0.2, opacity: 1 }, { scale: 4 * size, opacity: 0, duration: 1.2, ease: "power2.out", onComplete: () => ring.remove() });

    const n = Math.round(16 * size);
    for (let i = 0; i < n; i++) {
      const p = doc.createElement("div");
      p.className = "ix";
      const s = 8 + Math.random() * 14;
      Object.assign(p.style, {
        left: x + "px",
        top: y + "px",
        width: s + "px",
        height: s + "px",
        marginLeft: -s / 2 + "px",
        marginTop: -s / 2 + "px",
        background: `radial-gradient(circle, #fff 0%, rgba(${color},.9) 40%, rgba(${color},0) 72%)`,
      });
      root.appendChild(p);
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const d = (90 + Math.random() * 180) * size;
      gsap.fromTo(
        p,
        { x: 0, y: 0, opacity: 1 },
        {
          x: Math.cos(a) * d,
          y: Math.sin(a) * d + 60,
          opacity: 0,
          duration: 1 + Math.random() * 0.6,
          ease: "power3.out",
          onComplete: () => p.remove(),
        }
      );
    }
  };

  // brilho extra no vitral, separado dos elementos da timeline para não brigar com ela
  const boost = doc.createElement("div");
  boost.className = "ix";
  Object.assign(boost.style, {
    left: "300px",
    top: "-200px",
    width: "940px",
    height: "1300px",
    background: "radial-gradient(ellipse at center, rgba(255,120,90,.55) 0%, rgba(255,210,160,.35) 35%, rgba(255,200,150,0) 68%)",
    opacity: "0",
  });
  bg.appendChild(boost);

  const extraGlint = (x, y, delay = 0) => {
    const g = doc.createElement("div");
    g.className = "glint";
    g.innerHTML = '<div class="glint-core"></div>';
    Object.assign(g.style, { left: x + "px", top: y + "px" });
    mid.appendChild(g);
    gsap
      .timeline({ delay, onComplete: () => g.remove() })
      .fromTo(g, { opacity: 0, scale: 0.2, rotation: 0 }, { opacity: 1, scale: 1.3, rotation: 45, duration: 0.35, ease: "back.out(2)" })
      .to(g, { opacity: 0, scale: 0.3, rotation: 110, duration: 0.5, ease: "power2.in" });
  };

  const jumpTo = (t) => {
    tl.seek(t);
    setPlaying(true);
  };

  const ACTIONS = {
    // vitral: a luz se acende
    window: () => gsap.fromTo(boost, { opacity: 0 }, { opacity: 1, duration: 0.35, yoyo: true, repeat: 1, repeatDelay: 0.6, ease: "sine.inOut" }),
    // rostos: revive o encontro
    faces: () => jumpTo(5.9),
    // mãos dadas: brilho na aliança, nas mãos e no relógio
    hands: () => {
      extraGlint(556, 992, 0);
      extraGlint(870, 828, 0.15);
      extraGlint(955, 812, 0.3);
    },
    // o passo dela: volta para o pé levantado
    step: () => {
      extraGlint(262, 1525, 0);
      jumpTo(3);
    },
  };

  // segurar = câmera lenta; tocar = explosão de luz (+ ação da zona tocada)
  let holdTimer = null;
  let slow = false;
  doc.addEventListener("pointerdown", (e) => {
    holdTimer = setTimeout(() => {
      slow = true;
      gsap.to(tl, { timeScale: 0.2, duration: 0.5, ease: "power2.out" });
    }, 280);
  });
  const release = () => {
    clearTimeout(holdTimer);
    if (slow) gsap.to(tl, { timeScale: 1, duration: 0.6, ease: "power2.inOut" });
  };
  doc.addEventListener("pointerup", (e) => {
    release();
    if (slow) {
      slow = false;
      return;
    }
    const zone = e.target.closest?.("[data-hotspot]")?.dataset.hotspot;
    const meet = zone === "faces";
    ripple(e.clientX, e.clientY, meet ? "255,150,130" : "255,226,180", meet ? 1.6 : 1);
    if (zone) ACTIONS[zone]();
  });
  doc.addEventListener("pointercancel", release);
}
