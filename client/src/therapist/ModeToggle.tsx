export function ModeToggle({ mode, onChange }: { mode: 'roast' | 'serious'; onChange: (mode: 'roast' | 'serious') => void }) {
  return (
    <div className="mode-toggle" role="group" aria-label="Explanation style">
      <button type="button" className={mode === 'roast' ? 'active' : ''} onClick={() => onChange('roast')}>
        🔥 Roast me
      </button>
      <button type="button" className={mode === 'serious' ? 'active' : ''} onClick={() => onChange('serious')}>
        Explain seriously
      </button>
    </div>
  );
}
