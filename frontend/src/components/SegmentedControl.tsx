import styles from './SegmentedControl.module.css';

interface Option<T> {
  value: T;
  label: string;
  sublabel?: string;
}

interface Props<T extends string | number> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}

export function SegmentedControl<T extends string | number>({ options, value, onChange }: Props<T>) {
  return (
    <div className={styles.seg}>
      {options.map(opt => (
        <button
          key={String(opt.value)}
          className={`${styles.btn} ${opt.value === value ? styles.active : ''}`}
          onClick={() => onChange(opt.value)}
          type="button"
        >
          <strong>{opt.label}</strong>
          {opt.sublabel && <span>{opt.sublabel}</span>}
        </button>
      ))}
    </div>
  );
}
