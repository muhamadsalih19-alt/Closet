import { useEffect, useRef, type ReactNode } from 'react';
import { useStore } from '../state';
import { outfitCollage } from '../lib/images';
import type { Item } from '../lib/types';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="spinner-row" role="status">
      <span className="spinner" aria-hidden />
      {label && <span>{label}</span>}
    </div>
  );
}

export function ErrorNote({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div className="note bad">{msg}</div>;
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden>{icon}</div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function Chip({ on, onClick, children }: { on?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button type="button" className={'chip' + (on ? ' on' : '')} onClick={onClick} aria-pressed={on}>
      {children}
    </button>
  );
}

export function Sheet({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={'sheet' + (wide ? ' wide' : '')} role="dialog" aria-modal aria-label={title} onClick={(e) => e.stopPropagation()} ref={ref} tabIndex={-1}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

const CAT_ICON: Record<string, string> = {
  top: '👕', bottom: '👖', dress: '👗', outerwear: '🧥', shoes: '👟', bag: '👜', accessory: '🧣', activewear: '🎽', swimwear: '🩱', sleepwear: '🩳', other: '🏷️',
};

export function ItemPhoto({ item, size }: { item: Item | undefined; size?: 'sm' | 'md' | 'lg' }) {
  const { images } = useStore();
  const src = item ? images[item.id] : undefined;
  return (
    <div className={'photo ' + (size ?? 'md')}>
      {src ? <img src={src} alt={item?.name ?? ''} loading="lazy" /> : <span aria-hidden>{item ? CAT_ICON[item.category] : '❔'}</span>}
    </div>
  );
}

export function ItemTile({ item, onClick, selected, badge }: { item: Item; onClick?: () => void; selected?: boolean; badge?: string }) {
  return (
    <button type="button" className={'tile' + (selected ? ' selected' : '') + (item.inLaundry ? ' dim' : '')} onClick={onClick}>
      <ItemPhoto item={item} />
      <span className="tile-name">{item.name}</span>
      {item.favorite && <span className="tile-fav" aria-label="favourite">♥</span>}
      {item.inLaundry && <span className="tile-badge">In laundry</span>}
      {badge && <span className="tile-badge">{badge}</span>}
      {selected && <span className="tile-check" aria-hidden>✓</span>}
    </button>
  );
}

/** The pieces of an outfit laid out as a little flat-lay. */
export function OutfitBoard({ itemIds, onItem }: { itemIds: string[]; onItem?: (id: string) => void }) {
  const { data } = useStore();
  const items = itemIds.map((id) => data.items.find((i) => i.id === id)).filter((i): i is Item => !!i);
  return (
    <div className={'board n' + Math.min(items.length, 6)}>
      {items.map((it) => (
        <button key={it.id} type="button" className="board-cell" onClick={() => onItem?.(it.id)} title={it.name}>
          <ItemPhoto item={it} />
          <span className="board-label">{it.name}</span>
        </button>
      ))}
      {!items.length && <div className="muted">These pieces are no longer in your closet.</div>}
    </div>
  );
}

export function useShareOutfit() {
  const { data, images, toast } = useStore();
  return async (title: string, itemIds: string[]) => {
    const items = itemIds.map((id) => data.items.find((i) => i.id === id)).filter((i): i is Item => !!i);
    const blob = await outfitCollage(items.map((i) => images[i.id]), items.map((i) => i.name), title);
    const file = new File([blob], 'outfit.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title });
        return;
      } catch {
        return;
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'outfit.png';
    a.click();
    toast('Outfit image saved');
  };
}

export function PhotoButton({ label, onFiles, multiple, className, camera }: { label: ReactNode; onFiles: (files: File[]) => void; multiple?: boolean; className?: string; camera?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className={className ?? 'btn'} onClick={() => ref.current?.click()}>{label}</button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        multiple={multiple}
        {...(camera ? { capture: 'environment' as const } : {})}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
    </>
  );
}

export function shopUrl(q: string) {
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`;
}
