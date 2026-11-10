import clsx from 'clsx';

/** A real photo when one is uploaded, otherwise a labelled placeholder frame. */
export default function Photo({ src, label, dark, className, style }: { src?: string | null; label: string; dark?: boolean; className?: string; style?: React.CSSProperties }) {
  if (src) {
    return (
      <div className={clsx('relative overflow-hidden', className)} style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.04]" />
      </div>
    );
  }
  return (
    <div className={clsx('relative flex items-end overflow-hidden p-3.5', dark ? 'phd' : 'ph', className)} style={style} role="img" aria-label={`${label} (photo coming soon)`}>
      <span className="tag">{label}</span>
    </div>
  );
}
