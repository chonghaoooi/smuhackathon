import { useEffect, useRef, useState } from 'react';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type Emotion = 'curious' | 'concerned' | 'roast';

function emotionForScore(score: number | null): Emotion {
  if (score === null) return 'curious';
  if (score >= 80) return 'roast';
  if (score >= 60) return 'concerned';
  return 'curious';
}

export function Character({ score, speechText }: { score: number | null; speechText: string }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [typing, setTyping] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'playing'>('idle');
  const stageRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number; width: number; height: number } | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const lastSpeechRef = useRef(speechText);

  useEffect(() => {
    if (speechText !== lastSpeechRef.current) {
      lastSpeechRef.current = speechText;
      window.clearTimeout(timerRef.current);
      setTyping(true);
      timerRef.current = window.setTimeout(() => setTyping(false), 420);
    }
  }, [speechText]);

  useEffect(() => () => {
    window.clearTimeout(timerRef.current);
    window.speechSynthesis?.cancel();
  }, []);

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !characterRef.current) return;
    const rect = characterRef.current.getBoundingClientRect();
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y, width: rect.width, height: rect.height };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !stageRef.current) return;
    const stage = stageRef.current.getBoundingClientRect();
    const xLimit = Math.max(24, (stage.width - drag.width) / 2);
    const yLimit = Math.max(24, (stage.height - drag.height) / 2);
    setPosition({
      x: clamp(drag.originX + event.clientX - drag.startX, -xLimit, xLimit),
      y: clamp(drag.originY + event.clientY - drag.startY, -yLimit, yLimit)
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  const moveWithKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 24 : 8;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (!moves[event.key]) return;
    event.preventDefault();
    setPosition((current) => ({ x: current.x + moves[event.key][0], y: current.y + moves[event.key][1] }));
  };

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    if (voiceState === 'playing') {
      window.speechSynthesis.cancel();
      setVoiceState('idle');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 0.96;
    utterance.onend = () => setVoiceState('idle');
    window.speechSynthesis.speak(utterance);
    setVoiceState('playing');
  };

  const emotion = emotionForScore(score);

  return (
    <div className="orb-stage" ref={stageRef}>
      <div
        ref={characterRef}
        className={`character emotion-${emotion}${dragging ? ' is-dragging' : ''}`}
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
        <div className="speech" aria-live="polite">
          <div className="speech-head">
            <span>PORTFOLIO THERAPIST</span>
            <button
              type="button"
              className="voice-button"
              onClick={(event) => { event.stopPropagation(); speak(); }}
              aria-label={voiceState === 'playing' ? 'Stop voice' : 'Read insight aloud'}
            >
              {voiceState === 'playing' ? '■' : '♪'}
            </button>
          </div>
          {typing ? (
            <span className="typing-dots" aria-label="Typing"><i /><i /><i /></span>
          ) : (
            <p key={speechText}>{speechText}</p>
          )}
        </div>
        <div className="orb" aria-hidden="true">
          <span className="pt-shine" />
          <div className="pt-eyes"><span>,</span><span>,</span></div>
        </div>
      </div>
      <span className="drag-hint">↔ DRAG ME AROUND</span>
    </div>
  );
}
