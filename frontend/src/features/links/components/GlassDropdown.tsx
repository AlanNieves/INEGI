import { useRef, useState, useEffect } from "react";

type Option = { value: string; label: string };
type Props = {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void; // NUEVO
};

export default function GlassDropdown({ label, value, options, onChange, disabled, onOpenChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // NUEVO: Notifica al padre cuando cambia el estado de open
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
  }

  return (
    <div className="glass-dropdown" tabIndex={0} ref={ref} onBlur={handleBlur}>
      <label className="block text-sm text-cyan-200 mb-1">{label}</label>
      <button
        type="button"
        className={`glass-dropdown-btn ${disabled ? "disabled" : ""}`}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
      >
        {options.find((o) => o.value === value)?.label || "— Seleccionar —"}
        <span className={`arrow ${open ? "open" : ""}`}>▼</span>
      </button>
      <div className={`glass-dropdown-list ${open ? "open" : ""}`}>
        {options.map((o) => (
          <div
            key={o.value}
            className={`glass-dropdown-item ${o.value === value ? "selected" : ""}`}
            onClick={() => {
              onChange(o.value);
              setOpen(false);
            }}
            tabIndex={-1}
          >
            {o.label}
          </div>
        ))}
      </div>
      <style>{`
        .glass-dropdown { position: relative; width: 100%; }
        .glass-dropdown-btn {
          width: 100%;
          background: rgba(18,28,48,0.68);
          border: 1.5px solid rgba(80,180,255,0.18);
          color: #e6eef9;
          border-radius: 14px;
          padding: 10px 16px;
          font-size: 1rem;
          text-align: left;
          cursor: pointer;
          transition: border 0.18s, background 0.18s;
          display: flex; align-items: center; justify-content: space-between;
        }
        .glass-dropdown-btn:focus, .glass-dropdown-btn:hover {
          border-color: #3b82f6;
          background: rgba(30,40,60,0.82);
        }
        .glass-dropdown-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .arrow {
          margin-left: 8px;
          font-size: 0.9em;
          transition: transform 0.3s;
        }
        .arrow.open {
          transform: rotate(180deg);
        }
        .glass-dropdown-list {
          position: absolute;
          left: 0; right: 0;
          top: 110%;
          z-index: 50; /* <--- Asegura que esté por encima */
          background: rgba(18,28,48,0.92);
          border: 1.5px solid rgba(80,180,255,0.13);
          box-shadow: 0 8px 32px rgba(14,165,233,0.10);
          backdrop-filter: blur(16px) saturate(120%);
          -webkit-backdrop-filter: blur(16px) saturate(120%);
          border-radius: 14px;
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          pointer-events: none;
          transform: translateY(-10px) scaleY(0.98);
          transition: max-height 0.5s cubic-bezier(.4,2,.6,1), opacity 0.3s, transform 0.3s;
        }
        .glass-dropdown-list.open {
          max-height: 320px;
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0) scaleY(1);
        }
        .glass-dropdown-list {
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(180,220,255,0.18) rgba(0,0,0,0.0);
          max-height: 320px;
        }
        .glass-dropdown-list::-webkit-scrollbar {
          width: 8px;
          background: transparent;
        }
        .glass-dropdown-list::-webkit-scrollbar-thumb {
          background: rgba(180,220,255,0.18);
          border-radius: 8px;
          min-height: 32px;
          margin: 2px 0;
        }
        .glass-dropdown-list::-webkit-scrollbar-thumb:hover {
          background: rgba(180,220,255,0.28);
        }
        .glass-dropdown-item {
          padding: 10px 18px;
          cursor: pointer;
          color: #e6eef9;
          font-size: 1rem;
          transition: background 0.15s, color 0.15s;
        }
        .glass-dropdown-item:hover, .glass-dropdown-item.selected {
          background: rgba(59,130,246,0.13);
          color: #bfe0ff;
        }
      `}</style>
    </div>
  );
}