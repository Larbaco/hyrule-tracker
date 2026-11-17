import { t, tv } from './i18n';

export function PageProgress({ done, total, label = 'Progresso de conclusão', text, note }: {
  done: number;
  total: number;
  label?: string;
  text?: string;
  note?: string;
}) {
  if (total === 0) return null;

  return <div className="page-progress">
    <strong aria-live="polite">{text ?? tv('{done} de {total} objetivos concluídos', { done, total })}</strong>
    <progress className="page-progress-bar" value={done} max={total} aria-label={t(label)} />
    {note && <p>{t(note)}</p>}
  </div>;
}
