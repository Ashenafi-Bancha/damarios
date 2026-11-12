import Image from 'next/image';
import clsx from 'clsx';

/**
 * A photo, or a labelled placeholder frame when there is none yet.
 * Site photos in /images are optimized by Next (resized, WebP); photos uploaded from the admin are shown as they are.
 */
export default function Photo({ src, label, dark, className, style, sizes = '(min-width: 1024px) 50vw, 100vw', priority, position }: {
  src?: string | null; label: string; dark?: boolean; className?: string; style?: React.CSSProperties; sizes?: string; priority?: boolean;
  /** Which part of the photo stays visible when it is cropped, e.g. "50% 20%" to keep a face near the top. */
  position?: string;
}) {
  if (src) {
    return (
      <div className={clsx('relative overflow-hidden bg-ivory-warm', className)} style={style}>
        {src.startsWith('/images/') ? (
          <Image src={src} alt={label} fill sizes={sizes} priority={priority} style={position ? { objectPosition: position } : undefined} className="object-cover transition-transform duration-700 hover:scale-[1.04]" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.04]" />
        )}
      </div>
    );
  }
  return (
    <div className={clsx('relative flex items-end overflow-hidden p-3.5', dark ? 'phd' : 'ph', className)} style={style} role="img" aria-label={`${label} (photo coming soon)`}>
      <span className="tag">{label}</span>
    </div>
  );
}
