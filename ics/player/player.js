// Player interativo da composição HyperFrames da marca ICS.
// O vídeo (index.html) continua 100% determinístico para o render;
// toda interação vive aqui e só existe no navegador.

const W = 1920;
const H = 1080;
const DUR = 12;
const CHAPTERS = [
  { t: 0, name: "crescimento" },
  { t: 2.5, name: "icone" },
  { t: 4.6, name: "nome" },
  { t: 6.4, name: "assinatura" },
  { t: 8, name: "marca", brand: true },
  { t: 10.4, name: "final" },
];
const GOLD = "233,201,123";
const CREAM = "255,246,224";

const frame = document.getElementById("comp");
const wrap = document.getElementById("frame-wrap");
const btnPlay = document.getElementById("btn-play");
const btnRestart = document.getElementById("btn-restart");
const track = document.getElementById("track");
const fill = document.getElementById("fill");
const knob = document.getElementById("knob");
const chaptersEl = document.getElementById("chapters");
const hint = document.getElementById("hint");

function fit() {
  const s = Math.min((innerWidth - 32) / W, (innerHeight - 84 - 64) / H);
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
  const root = doc.getElementById("root");
  const $ = (sel) => doc.querySelector(sel);
  const $$ = (sel) => [...doc.querySelectorAll(sel)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Zonas clicáveis passam a receber ponteiro (no render elas são só divs vazias)
  const style = doc.createElement("style");
  style.textContent = `
    .hotspot { pointer-events: auto; cursor: pointer; }
    #root { cursor: crosshair; }
    .ix { position: absolute; pointer-events: none; border-radius: 50%; mix-blend-mode: screen; }
    .sq { transition: filter .35s ease, box-shadow .35s ease; }
    .sq.hover { filter: brightness(1.18) saturate(1.1); box-shadow: inset 0 1px 0 rgba(255,240,200,.5), 0 0 40px rgba(233,201,123,.55), 0 18px 40px rgba(0,0,0,.25); }
    #sub .ch { transition: color .5s ease; }
    #sub .ch.lit { color: #fff3cf; transition: color .08s ease; }
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
  const jumpTo = (t) => {
    tl.seek(t);
    setPlaying(true);
  };

  // ---------- linha do tempo com capítulos ----------
  CHAPTERS.forEach((c) => {
    const dot = document.createElement("span");
    dot.className = "chapter" + (c.brand ? " brand" : "");
    dot.style.left = (c.t / DUR) * 100 + "%";
    dot.title = c.name;
    chaptersEl.appendChild(dot);
  });

  let scrubbing = false;
  let wasPlaying = true;
  const seekFromEvent = (e) => {
    const r = track.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    let t = f * DUR;
    for (const c of CHAPTERS) if (Math.abs(c.t - t) < 0.25) t = c.t; // ímã nos capítulos
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
    } else if (e.code === "ArrowRight") tl.seek(Math.min(DUR - 0.01, tl.time() + 1));
    else if (e.code === "ArrowLeft") tl.seek(Math.max(0, tl.time() - 1));
    else if (e.key === "m" || e.key === "M") jumpTo(8);
    else if (/^[1-6]$/.test(e.key)) tl.seek(CHAPTERS[+e.key - 1].t);
  };
  addEventListener("keydown", onKey);
  doc.addEventListener("keydown", onKey);

  // ---------- profundidade: cada plano segue o ponteiro em velocidades diferentes ----------
  const planes = [
    ["#par-bg", 18, 1],
    ["#tilt-chart", 34, 2],
    ["#tilt-icon", 46, 5],
    ["#par-text", 30, 3.5],
    ["#par-fx", 60, 2],
  ].map(([sel, amp, rot]) => {
    const el = $(sel);
    gsap.set(el, { transformPerspective: 1400, transformOrigin: "50% 50%" });
    return {
      amp,
      rot,
      x: gsap.quickTo(el, "x", { duration: 1, ease: "power3.out" }),
      y: gsap.quickTo(el, "y", { duration: 1, ease: "power3.out" }),
      ry: gsap.quickTo(el, "rotationY", { duration: 1.2, ease: "power3.out" }),
      rx: gsap.quickTo(el, "rotationX", { duration: 1.2, ease: "power3.out" }),
    };
  });

  // luz dourada que acompanha o ponteiro
  const spot = doc.createElement("div");
  spot.className = "ix";
  Object.assign(spot.style, {
    left: "0px",
    top: "0px",
    width: "760px",
    height: "760px",
    marginLeft: "-380px",
    marginTop: "-380px",
    background: `radial-gradient(circle, rgba(${GOLD},.2) 0%, rgba(${GOLD},.07) 35%, rgba(${GOLD},0) 65%)`,
    opacity: "0",
  });
  root.insertBefore(spot, $("#logo"));
  const spotX = gsap.quickTo(spot, "x", { duration: 0.6, ease: "power3.out" });
  const spotY = gsap.quickTo(spot, "y", { duration: 0.6, ease: "power3.out" });

  const lean = (nx, ny) => {
    if (reduce) return;
    planes.forEach((p) => {
      p.x(-nx * p.amp);
      p.y(-ny * p.amp);
      p.ry(nx * p.rot);
      p.rx(-ny * p.rot * 0.6);
    });
  };

  const squares = $$(".sq");
  const hitSquare = (x, y) =>
    squares.find((sq) => {
      const r = sq.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });

  let hinted = false;
  doc.addEventListener("pointermove", (e) => {
    lean(e.clientX / W - 0.5, e.clientY / H - 0.5);
    spotX(e.clientX);
    spotY(e.clientY);
    gsap.to(spot, { opacity: 1, duration: 0.4, overwrite: "auto" });
    // blocos acendem sob o ponteiro
    const over = hitSquare(e.clientX, e.clientY);
    squares.forEach((sq) => sq.classList.toggle("hover", sq === over));
    if (!hinted) {
      hinted = true;
      setTimeout(() => hint.classList.add("gone"), 4000);
    }
  });
  doc.addEventListener("pointerleave", () => {
    lean(0, 0);
    squares.forEach((sq) => sq.classList.remove("hover"));
    gsap.to(spot, { opacity: 0, duration: 0.8, overwrite: "auto" });
  });
  // celular: inclinar o aparelho também mexe a profundidade
  addEventListener("deviceorientation", (e) => {
    if (e.gamma == null) return;
    lean(Math.max(-1, Math.min(1, e.gamma / 30)) * 0.5, Math.max(-1, Math.min(1, (e.beta - 45) / 30)) * 0.5);
  });

  // ---------- efeitos de toque ----------
  const ripple = (x, y, color = GOLD, size = 1) => {
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
      boxShadow: `0 0 30px rgba(${color},.7), inset 0 0 20px rgba(${color},.45)`,
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
        { x: Math.cos(a) * d, y: Math.sin(a) * d + 50, opacity: 0, duration: 1 + Math.random() * 0.6, ease: "power3.out", onComplete: () => p.remove() }
      );
    }
  };

  const centerOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r };
  };

  // seta: dispara uma cópia rumo ao canto superior e soma "crescimento"
  let growth = 0;
  const launchArrow = () => {
    const arrow = $("#arrow");
    const { x, y, r } = centerOf(arrow);
    const ghost = arrow.cloneNode(true);
    ghost.removeAttribute("id");
    ghost.querySelector("polygon").setAttribute("fill", "#f2d48c"); // a regra CSS é por id
    Object.assign(ghost.style, {
      position: "absolute",
      left: r.left + "px",
      top: r.top + "px",
      width: r.width + "px",
      height: r.height + "px",
      pointerEvents: "none",
      filter: "drop-shadow(0 0 22px rgba(255,220,140,.95))",
    });
    root.appendChild(ghost);
    gsap
      .timeline({ onComplete: () => ghost.remove() })
      .to(ghost, { x: 900, y: -900, scale: 0.4, opacity: 0, duration: 1.1, ease: "power3.in" });

    // rastro de faíscas atrás da seta
    for (let i = 0; i < 14; i++) {
      const p = doc.createElement("div");
      p.className = "ix";
      const s = 6 + Math.random() * 10;
      Object.assign(p.style, {
        left: x + "px",
        top: y + "px",
        width: s + "px",
        height: s + "px",
        marginLeft: -s / 2 + "px",
        marginTop: -s / 2 + "px",
        background: `radial-gradient(circle, #fff 0%, rgba(${GOLD},.9) 40%, rgba(${GOLD},0) 72%)`,
      });
      root.appendChild(p);
      const k = 120 + i * 45;
      gsap.fromTo(
        p,
        { x: 0, y: 0, opacity: 0 },
        { x: k + (Math.random() - 0.5) * 60, y: -k + (Math.random() - 0.5) * 60, opacity: 1, duration: 0.3 + i * 0.04, delay: i * 0.03, ease: "power2.in" }
      );
      gsap.to(p, { opacity: 0, duration: 0.5, delay: 0.3 + i * 0.07, onComplete: () => p.remove() });
    }

    // contador de crescimento
    growth += 7 + Math.round(Math.random() * 11);
    const tag = doc.createElement("div");
    tag.textContent = `+${growth}%`;
    Object.assign(tag.style, {
      position: "absolute",
      left: x + 60 + "px",
      top: y - 40 + "px",
      font: '600 42px/1 "Montserrat", sans-serif',
      letterSpacing: "0.08em",
      color: "#f2d48c",
      textShadow: "0 0 18px rgba(233,201,123,.8)",
      pointerEvents: "none",
      whiteSpace: "nowrap",
    });
    root.appendChild(tag);
    gsap
      .timeline({ onComplete: () => tag.remove() })
      .fromTo(tag, { opacity: 0, y: 20, scale: 0.6 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(2.5)" })
      .to(tag, { opacity: 0, y: -90, duration: 0.9, ease: "power2.in" }, "+=0.5");

    ripple(x, y, CREAM, 1.3);
  };

  // bloco: gira em 3D e solta faíscas
  const flipSquare = (sq) => {
    if (sq._flipping) return;
    sq._flipping = true;
    gsap.fromTo(
      sq,
      { rotationY: 0, transformPerspective: 600 },
      { rotationY: 360, duration: 0.9, ease: "back.out(1.4)", onComplete: () => (sq._flipping = false) }
    );
    const { x, y } = centerOf(sq);
    ripple(x, y, GOLD, 0.8);
  };

  // nome: as letras giram em sequência e um brilho dourado atravessa
  const shine = $("#name-shine").cloneNode(true);
  shine.id = "ix-shine";
  Object.assign(shine.style, {
    position: "absolute",
    left: "812px",
    top: "352px",
    height: "290px",
    font: '500 300px/290px "Cormorant Garamond", serif',
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
    color: "transparent",
    background: "linear-gradient(105deg, rgba(255,255,255,0) 35%, #fff6d8 47%, #e9c97b 52%, rgba(255,255,255,0) 64%)",
    backgroundSize: "300% 100%",
    backgroundPosition: "100% 0",
    webkitBackgroundClip: "text",
    backgroundClip: "text",
    opacity: "0",
    pointerEvents: "none",
  });
  $("#par-text").appendChild(shine);
  const shineName = () => {
    const letters = $$("#name .ltr");
    gsap.fromTo(
      letters,
      { rotationX: 0, transformPerspective: 800, transformOrigin: "50% 60%" },
      { rotationX: -360, duration: 0.9, ease: "power3.inOut", stagger: 0.1, overwrite: "auto", onComplete: () => gsap.set(letters, { rotationX: 0 }) }
    );
    gsap.fromTo(shine, { opacity: 1, backgroundPosition: "100% 0" }, { backgroundPosition: "0% 0", duration: 1.1, delay: 0.25, ease: "power2.inOut" });
    gsap.to(shine, { opacity: 0, duration: 0.2, delay: 1.35 });
  };

  // assinatura: uma onda de luz corre pelas letras
  const waveTagline = () => {
    $$("#sub .ch").forEach((ch, i) => {
      setTimeout(() => {
        ch.classList.add("lit");
        gsap.fromTo(ch, { scale: 1 }, { scale: 1.45, duration: 0.18, yoyo: true, repeat: 1, ease: "sine.out" });
        setTimeout(() => ch.classList.remove("lit"), 220);
      }, i * 40);
    });
    gsap.fromTo($("#dash"), { scaleX: 1 }, { scaleX: 1.8, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out" });
  };

  // segurar = câmera lenta; tocar = onda de luz (+ ação da zona tocada)
  let holdTimer = null;
  let slow = false;
  doc.addEventListener("pointerdown", () => {
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
    if (zone === "arrow") return launchArrow();
    if (zone === "icon") {
      const sq = hitSquare(e.clientX, e.clientY);
      return sq ? flipSquare(sq) : ripple(e.clientX, e.clientY);
    }
    if (zone === "name") {
      ripple(e.clientX, e.clientY, CREAM, 0.8);
      return shineName();
    }
    if (zone === "tagline") return waveTagline();
    ripple(e.clientX, e.clientY);
  });
  doc.addEventListener("pointercancel", release);
}
