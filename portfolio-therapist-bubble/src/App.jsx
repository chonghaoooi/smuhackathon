import { useEffect, useMemo, useRef, useState } from "react";
import { analysePortfolio } from "./analytics.js";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const emotionForScore = (score) => score >= 80 ? "roast" : score >= 60 ? "concerned" : "curious";

export function App() {
  const analysis = useMemo(() => analysePortfolio(), []);
  const [mode, setMode] = useState("roast");
  const [activeId, setActiveId] = useState("fomo");
  const [evidenceOpen, setEvidenceOpen] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [typing, setTyping] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState("");
  const [voiceState, setVoiceState] = useState("idle");
  const stageRef = useRef(null);
  const characterRef = useRef(null);
  const dragRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const activeFinding = analysis.findings.find((finding) => finding.id === activeId) || analysis.findings[0];
  const displayedCopy = generatedCopy || activeFinding[mode];

  useEffect(() => () => {
    window.clearTimeout(timerRef.current);
    if (audioRef.current) URL.revokeObjectURL(audioRef.current.src);
  }, []);

  const revealFinding = (id) => {
    window.clearTimeout(timerRef.current);
    setActiveId(id);
    setGeneratedCopy("");
    setTyping(true);
    timerRef.current = window.setTimeout(() => setTyping(false), 460);
  };

  const changeMode = async (nextMode) => {
    setMode(nextMode);
    setGeneratedCopy("");
    setTyping(true);
    try {
      const response = await fetch("/api/therapist/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: nextMode, finding: activeFinding }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.text) setGeneratedCopy(data.text);
      }
    } catch {
      // Deterministic copy remains available when the optional AI service is offline.
    } finally {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setTyping(false), 280);
    }
  };

  const speak = async () => {
    if (voiceState === "playing") {
      audioRef.current?.pause();
      setVoiceState("idle");
      return;
    }
    setVoiceState("loading");
    try {
      const response = await fetch("/api/therapist/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: displayedCopy }),
      });
      if (!response.ok) throw new Error("Voice unavailable");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setVoiceState("idle");
        URL.revokeObjectURL(url);
      };
      await audio.play();
      setVoiceState("playing");
    } catch {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(displayedCopy);
        utterance.rate = 0.96;
        utterance.onend = () => setVoiceState("idle");
        window.speechSynthesis.speak(utterance);
        setVoiceState("playing");
      } else {
        setVoiceState("idle");
      }
    }
  };

  const playDemo = () => {
    if (playing) return;
    setPlaying(true);
    const sequence = ["fomo", "overtrading", "concentration", "averagingDown"];
    sequence.forEach((id, index) => window.setTimeout(() => revealFinding(id), index * 1350));
    window.setTimeout(() => {
      setMode("roast");
      setPlaying(false);
    }, sequence.length * 1350);
  };

  const beginDrag = (event) => {
    if (event.button !== 0) return;
    const rect = characterRef.current.getBoundingClientRect();
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y, width: rect.width, height: rect.height };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !stageRef.current) return;
    const stage = stageRef.current.getBoundingClientRect();
    const xLimit = Math.max(24, (stage.width - drag.width) / 2);
    const yLimit = Math.max(24, (stage.height - drag.height) / 2);
    setPosition({
      x: clamp(drag.originX + event.clientX - drag.startX, -xLimit, xLimit),
      y: clamp(drag.originY + event.clientY - drag.startY, -yLimit, yLimit),
    });
  };

  const endDrag = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  const moveWithKeyboard = (event) => {
    const step = event.shiftKey ? 24 : 8;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (!moves[event.key]) return;
    event.preventDefault();
    setPosition((current) => ({ x: current.x + moves[event.key][0], y: current.y + moves[event.key][1] }));
  };

  return (
    <main className="app-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="/team/therapist" aria-label="Portfolio Therapist home"><span className="brand-orb" />PORTFOLIO THERAPIST</a>
        <span className="demo-pill"><i /> LIVE DEMO · {analysis.owner.toUpperCase()}</span>
      </nav>

      <section className="hero" ref={stageRef}>
        <div className="hero-copy">
          <span className="kicker">BEHAVIOURAL FINANCE, WITH FEELINGS</span>
          <h1>Your strategy says<br />long-term. Your <em>trades</em><br />say otherwise.</h1>
          <p>We measure your investing behaviour first. Then the AI explains what the numbers already know.</p>
          <button className="demo-cta" type="button" onClick={playDemo} disabled={playing}>
            <span>{playing ? "Running analysis…" : "Play judge demo"}</span><b>→</b>
          </button>
          <span className="disclaimer">Behavioural patterns only · Not investment advice</span>
        </div>

        <div className="orb-stage">
          <div
            ref={characterRef}
            className={`character emotion-${emotionForScore(activeFinding.score)}${dragging ? " is-dragging" : ""}`}
            style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
            onPointerDown={beginDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={moveWithKeyboard}
            role="button"
            tabIndex={0}
            aria-label="Draggable Portfolio Therapist. Use arrow keys to move."
          >
            <div className={`speech ${typing ? "is-typing" : ""}`} aria-live="polite">
              <div className="speech-head">
                <span>PORTFOLIO THERAPIST</span>
                <button type="button" className="voice-button" onClick={(event) => { event.stopPropagation(); speak(); }} aria-label={voiceState === "playing" ? "Stop voice" : "Read insight aloud"}>
                  {voiceState === "loading" ? "···" : voiceState === "playing" ? "■" : "♪"}
                </button>
              </div>
              {typing ? <span className="typing-dots" aria-label="Typing"><i /><i /><i /></span> : <p key={`${activeId}-${mode}-${displayedCopy}`}>{displayedCopy}</p>}
            </div>
            <div className="orb" aria-hidden="true"><span className="shine" /><div className="eyes"><span>,</span><span>,</span></div></div>
          </div>
          <span className="drag-hint">↔ DRAG ME AROUND</span>
        </div>
      </section>

      <section className="analysis-panel" aria-labelledby="analysis-title">
        <div className="analysis-heading">
          <div>
            <span className="section-label">YOUR PORTFOLIO STATE</span>
            <h2 id="analysis-title">{analysis.state}</h2>
          </div>
          <div className="overall-score"><strong>{analysis.score}</strong><span>/ 100<br />BEHAVIOUR SCORE</span></div>
        </div>

        <div className="mode-toggle" role="group" aria-label="Explanation style">
          <button type="button" className={mode === "roast" ? "active" : ""} onClick={() => changeMode("roast")}>🔥 Roast me</button>
          <button type="button" className={mode === "serious" ? "active" : ""} onClick={() => changeMode("serious")}>Explain seriously</button>
        </div>

        <div className="score-list">
          {analysis.findings.map((finding) => (
            <button type="button" className={`score-row ${activeId === finding.id ? "selected" : ""}`} onClick={() => revealFinding(finding.id)} key={finding.id}>
              <span className={`score-dot ${finding.tone}`} />
              <span className="score-name">{finding.label}</span>
              <span className="score-track"><i style={{ width: `${finding.score}%` }} /></span>
              <strong>{finding.score}</strong>
            </button>
          ))}
        </div>

        <article className="finding-card">
          <div className="finding-title"><span className={`score-dot ${activeFinding.tone}`} /><div><small>DETECTED PATTERN</small><h3>{activeFinding.label}</h3></div><strong>{activeFinding.score}</strong></div>
          <p>{activeFinding.summary}</p>
          <button className="evidence-toggle" type="button" onClick={() => setEvidenceOpen((open) => !open)} aria-expanded={evidenceOpen}>
            {evidenceOpen ? "Hide evidence" : "Show evidence"}<span>{evidenceOpen ? "−" : "+"}</span>
          </button>
          {evidenceOpen && (
            <div className="evidence-grid">
              {activeFinding.evidence.map((item, index) => <div key={item}><small>{index === 0 ? "TRIGGER" : index === 1 ? "MEASURED" : "CONTEXT"}</small><span>{item}</span></div>)}
              <div className="formula"><small>SCORE BREAKDOWN</small><span>{activeFinding.breakdown}</span></div>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
