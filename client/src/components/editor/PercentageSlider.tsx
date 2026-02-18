/**
 * PercentageSlider — Range slider for percentage input nodes.
 *
 * Dragging updates value in real time.
 * Must have className="nodrag" to prevent React Flow capturing drag events.
 * Design spec Section 7.2 (.revenue-node__slider)
 */

interface PercentageSliderProps {
  value: number; // 0.0 - 1.0 (decimal)
  onChange: (value: number) => void;
  min?: number; // default 0
  max?: number; // default 1 (100%)
  disabled?: boolean;
}

export function PercentageSlider({
  value,
  onChange,
  min = 0,
  max = 1,
  disabled = false,
}: PercentageSliderProps) {
  const valuePercent = value * 100;
  const minPercent = min * 100;
  const maxPercent = max * 100;

  // Clamp fill percentage for background gradient
  const fillPct = Math.max(
    0,
    Math.min(100, ((valuePercent - minPercent) / (maxPercent - minPercent)) * 100)
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const pct = parseFloat(e.target.value);
    onChange(pct / 100);
  }

  return (
    <div className="pct-slider nodrag">
      <input
        type="range"
        className="pct-slider__input"
        min={minPercent}
        max={maxPercent}
        step={0.1}
        value={valuePercent}
        onChange={handleChange}
        disabled={disabled}
        aria-label="Adjust percentage"
        style={{
          background: disabled
            ? `linear-gradient(to right, var(--color-border-strong) 0%, var(--color-border-strong) ${fillPct}%, var(--color-border) ${fillPct}%, var(--color-border) 100%)`
            : `linear-gradient(to right, var(--color-brand) 0%, var(--color-brand) ${fillPct}%, var(--color-border) ${fillPct}%, var(--color-border) 100%)`,
        }}
      />

      <style>{`
        .pct-slider {
          width: 100%;
          padding: 0;
        }

        .pct-slider__input {
          width: 100%;
          height: 4px;
          border-radius: var(--radius-full);
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
          outline: none;
          border: none;
          padding: 0;
        }

        .pct-slider__input:disabled {
          cursor: default;
          opacity: 0.5;
        }

        .pct-slider__input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: var(--radius-full);
          background: var(--color-brand);
          border: 2px solid white;
          box-shadow: var(--shadow-xs);
          cursor: grab;
          transition: transform var(--duration-fast) var(--ease-default);
        }

        .pct-slider__input:disabled::-webkit-slider-thumb {
          background: var(--color-border-strong);
          cursor: default;
        }

        .pct-slider__input::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.2);
        }

        .pct-slider__input::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: var(--radius-full);
          background: var(--color-brand);
          border: 2px solid white;
          box-shadow: var(--shadow-xs);
          cursor: grab;
          transition: transform var(--duration-fast) var(--ease-default);
        }

        .pct-slider__input:focus-visible {
          outline: 2px solid var(--color-focus-ring);
          outline-offset: 2px;
          border-radius: var(--radius-full);
        }
      `}</style>
    </div>
  );
}
