import { useLayoutEffect, useRef, useState } from 'react';
import { LOCAL_NAMES } from '../core/companion';
import discoveries from '../../data/easter-eggs.json';
import { api } from './api';
import { currentLocale, t, tv } from './i18n';
import { PageProgress } from './PageProgress';
import './easter-eggs.css';

type Discovery = (typeof discoveries)[number];

const kinds: Record<string, string> = { detail: 'Detalhe visual', interaction: 'Interação', dialogue: 'Diálogo' };
const areaNames = Object.entries(LOCAL_NAMES);
const regions = new Map<string, Discovery[]>();
for (const entry of discoveries) {
  const group = regions.get(entry.region);
  if (group) group.push(entry);
  else regions.set(entry.region, [entry]);
}
function catalogLanguage() {
  switch (currentLocale()) {
    case 'pt-BR': return { key: 'pt', lang: 'pt-BR' } as const;
    case 'es-ES': return { key: 'es', lang: 'es-ES' } as const;
    default: return { key: 'en', lang: 'en-US' } as const;
  }
}

export default function EasterEggs({ marks, offline, areaPhoto }: {
  marks: string[];
  offline: boolean;
  areaPhoto: (area: string) => string | undefined;
}) {
  const [region, setRegion] = useState('');
  const focusOnReturn = useRef('');
  const gallery = useRef<HTMLUListElement>(null);
  const regionHeading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    if (region) regionHeading.current?.focus();
    else if (focusOnReturn.current) {
      const button = [...(gallery.current?.querySelectorAll('button') ?? [])].find(el => el.value === focusOnReturn.current);
      (button ?? gallery.current)?.focus();
      focusOnReturn.current = '';
    }
  }, [region]);
  const found = new Set(marks);
  const language = catalogLanguage();
  const foundIn = (entries: Discovery[]) => entries.filter(entry => found.has(entry.id)).length;
  const regionEntries = regions.get(region);
  const regionImage = (name: string) => areaPhoto(areaNames.find(([, label]) => label === name)?.[0] ?? '');
  return <div className="easter-eggs">
    <PageProgress done={found.size} total={discoveries.length} label="Progresso das descobertas"
      text={tv('{done} de {total} descobertas', { done: found.size, total: discoveries.length })}
      note="Marcação manual com progresso próprio, separado do Checklist 100%." />

    {regionEntries ? <section className="easter-area">
      <button className="action easter-back" type="button" onClick={() => {
        focusOnReturn.current = region;
        setRegion('');
      }}>{t('Voltar às regiões')}</button>
      <div className="easter-area-banner">
        <RegionPhoto source={regionImage(region)} />
        <div className="easter-area-body">
          <h2 ref={regionHeading} tabIndex={-1}>{t(region)}</h2>
          <RegionMeter done={foundIn(regionEntries)} total={regionEntries.length} />
        </div>
      </div>
      <ul className="easter-region">
        {regionEntries.map(entry => <DiscoveryRow key={entry.id} entry={entry} language={language} checked={found.has(entry.id)} offline={offline} />)}
      </ul>
    </section> : <ul className="easter-gallery" ref={gallery} tabIndex={-1}>
      {[...regions].map(([name, entries]) =>
        <li key={name}>
          <button className="easter-region-card" type="button" value={name} onClick={() => setRegion(name)}>
            <RegionPhoto source={regionImage(name)} />
            <span className="easter-region-preview">
              <strong>{t(name)}</strong>
              <RegionMeter done={foundIn(entries)} total={entries.length} />
            </span>
          </button>
        </li>)}
    </ul>}
  </div>;
}

function RegionPhoto({ source }: { source?: string }) {
  return <span className="easter-photo">
    {source && <img src={source} alt="" width={320} height={144} loading="lazy" decoding="async"
      onError={event => { event.currentTarget.hidden = true; }} />}
  </span>;
}

function RegionMeter({ done, total }: { done: number; total: number }) {
  return <span className="easter-region-meter">
    <span>{tv('{done} de {total} descobertas', { done, total })}</span>
    <progress className="page-progress-bar" value={done} max={total} aria-label={t('Progresso das descobertas')} />
  </span>;
}

function DiscoveryRow({ entry, language, checked, offline }: {
  entry: Discovery;
  language: ReturnType<typeof catalogLanguage>;
  checked: boolean;
  offline: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const copy = entry.text[language.key];
  const titleId = `easter-egg-${entry.id}`;
  const markId = `${titleId}-mark`;

  async function mark(found: boolean) {
    setFailed(false);
    setSaving(true);
    try {
      setFailed(!await api.setEasterEggFound(entry.id, found));
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return <li className="easter-entry">
    <div className="easter-entry-heading">
      <h3 id={titleId} lang={language.lang}>{copy.title}</h3>
      <label className="easter-mark">
        <input type="checkbox" checked={checked} aria-labelledby={`${markId} ${titleId}`}
          aria-disabled={saving || offline} aria-busy={saving} onChange={event => {
            if (!saving && !offline) void mark(event.currentTarget.checked);
          }} />
        <span id={markId}>{t('Encontrei')}</span>
      </label>
    </div>
    <p className="easter-metadata">
      {t(kinds[entry.kind])}
      {'age' in entry && entry.age && <> · {t(entry.age === 'both' ? 'Criança e adulto' : entry.age === 'child' ? 'Criança' : 'Adulto')}</>}
      {'early' in entry && entry.early && <strong> · {t('Janela de acesso limitada')}</strong>}
    </p>
    <p className="easter-hint" lang={language.lang}>{copy.hint}</p>
    {failed && <p className="easter-error" role="alert">{t('Não foi possível salvar a marcação. Tente novamente.')}</p>}
    <details className="easter-solution">
      <summary>{t('Revelar como encontrar')}</summary>
      <p lang={language.lang}>{copy.solution}</p>
      <ul className="easter-sources" aria-label={t('Fontes')}>
        {entry.sources.map(source => <li key={source}>
          <a href={source} target="_blank" rel="noreferrer">{new URL(source).hostname.replace(/^www\./, '')}</a>
        </li>)}
      </ul>
    </details>
  </li>;
}
