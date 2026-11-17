import { useEffect, useMemo, useState } from 'react';
import type { AppState, AvailableEntry, TrackedItem } from '../shared/types';
import { LOCAL_NAMES } from '../core/companion';
import atlas from '../../data/atlas.json';
import { api } from './api';
import { GameItemIcon, itemImage, trackedItemIcon } from './GameItemIcon';
import { message, plural, t, tail } from './i18n';
import { areaShot, atEdge, atlasStages, findRegion, locateSpot, MAP_CATEGORIES, rowMarkers, type Spot } from './CompanionPages';

type Place = (typeof atlas.places)[number];
/** Where an entry sits: the atlas region, the exact point on one of its floor maps, and in-game photos of the spot. */
interface Where { region: string; place?: Place; at?: { map: string; x: number; y: number }; spot?: string; photos: string[] }
interface Todo { entry: AvailableEntry; item?: TrackedItem; where: Where }
interface Group { key: string; name: string; here: boolean; shot?: string; todos: Todo[] }

/** "Hookshot" -> the game's Hookshot icon, when there is one. */
const usesIcon = (label: string) => {
  const id = label.toLowerCase().replace(/['’]/g, '').replace(/\s*\(.*\)$/, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return itemImage(id) ? id : itemImage(id.replace(/s$/, '')) ? id.replace(/s$/, '') : undefined;
};

/**
 * "What to do": what the logic says you can get right now with what you have, by region (where you are first),
 * each with its spot on the map, photos of the place, how to get it and what you'll use.
 */
export function WhatToDo({ state, onShowInChecklist, onShowOnMap }: { state: AppState; onShowInChecklist: (id: string) => void; onShowOnMap: (id: string) => void }) {
  const rows = useMemo(() => new Map(state.categories.flatMap(c => c.items.map(i => [i.id, i] as const))), [state.categories]);
  const markers = useMemo(() => rowMarkers(state.atlasLinks), [state.atlasLinks]);
  const spots = useMemo(() => new Map<string, Spot>([
    ...Object.entries(state.placements ?? {}).flatMap(([cat, list]) => list.map(p => [`${cat}.0x${p.hash.toString(16)}`, p] as [string, Spot])),
    ...Object.entries(state.worldMarkers ?? {}),
  ]), [state.placements, state.worldMarkers]);

  const groups = useMemo(() => {
    const where = (entry: AvailableEntry): Where => {
      const marker = markers.get(entry.id);
      if (marker) return { region: atlasStages[marker.place] ?? '', place: atlas.places.find(p => p.id === marker.place), at: marker.at ?? undefined, spot: marker.name, photos: marker.images };
      const spot = spots.get(entry.id);
      const fix = spot ? locateSpot(spot).find(f => f.mapId && f.at && !atEdge(f.at)) : undefined;
      if (fix) return { region: atlasStages[fix.placeId] ?? '', place: atlas.places.find(p => p.id === fix.placeId), at: { map: fix.mapId!, x: fix.at!.x, y: fix.at!.y }, photos: [] };
      return { region: findRegion(entry.region) ?? '', photos: [] };
    };
    const byKey = new Map<string, Group>();
    for (const entry of state.available) {
      const w = where(entry);
      const key = w.region || entry.region;
      const group = byKey.get(key) ?? { key, name: LOCAL_NAMES[key] ?? entry.region, here: false, shot: w.region ? areaShot(w.region) : undefined, todos: [] };
      group.here ||= entry.here;
      group.todos.push({ entry, item: rows.get(entry.id), where: w });
      byKey.set(key, group);
    }
    // Where you are first, then the regions with the most to do.
    return [...byKey.values()].sort((a, b) => Number(b.here) - Number(a.here) || b.todos.length - a.todos.length);
  }, [state.available, rows, markers, spots]);

  const [picked, setPicked] = useState<string>();
  const all = groups.flatMap(g => g.todos);
  const current = all.find(x => x.entry.id === picked) ?? groups[0]?.todos[0];
  // Keep a valid pick as entries get collected.
  useEffect(() => { if (picked && !all.some(x => x.entry.id === picked)) setPicked(undefined); }, [all.length]);

  if (!state.summary) return <p className="quiet">{t('Encontre um save para ver o que dá para fazer agora.')}</p>;
  if (!groups.length) return <div className="todo-empty"><b>{t('Nada ao seu alcance agora')}</b><p>{t('Avance na história ou pegue novos itens para liberar mais objetivos.')}</p></div>;

  const first = groups[0];
  return <div className="todo-page">
    <section className="todo-hero" style={first.shot ? { backgroundImage: `linear-gradient(90deg, #120f0ef2 0%, #120f0ecc 45%, #120f0e33 100%), url("${first.shot}")` } : undefined}>
      <span className="todo-eyebrow">{first.here ? t('Você está aqui') : t('Comece por aqui')}</span>
      <h2>{t(first.name)}</h2>
      <p>{plural(first.todos.length, '{n} objetivo ao seu alcance nesta região', '{n} objetivos ao seu alcance nesta região')}</p>
      <div className="todo-hero-picks">{first.todos.slice(0, 4).map(x => (
        <button key={x.entry.id} type="button" onClick={() => setPicked(x.entry.id)}>
          {x.item && <GameItemIcon id={trackedItemIcon(x.item)} size={18} />}<span>{tail(x.entry.name)}</span>
        </button>
      ))}</div>
      <small>{message('{n} objetivos ao seu alcance com o que você já tem, em {areas} regiões.', { n: state.available.length, areas: groups.length })}</small>
    </section>

    <div className="todo-body">
      <div className="todo-regions">{groups.map(g => (
        <section key={g.key} className={`todo-region ${g.here ? 'here' : ''}`}>
          <header>
            {g.shot ? <img src={g.shot} alt="" /> : <span className="todo-region-blank" />}
            <div><h3>{t(g.name)}</h3><small>{plural(g.todos.length, '{n} objetivo', '{n} objetivos')}</small></div>
            {g.here && <span className="here-tag">{t('você está aqui')}</span>}
          </header>
          <ul>{g.todos.map(x => (
            <li key={x.entry.id}>
              <button type="button" className={current?.entry.id === x.entry.id ? 'selected' : ''} aria-pressed={current?.entry.id === x.entry.id} onClick={() => setPicked(x.entry.id)}>
                <span className="todo-icon">{x.item && <GameItemIcon id={trackedItemIcon(x.item)} size={26} />}</span>
                <span className="todo-text">
                  <b>{x.entry.categoryId === 'gold_skulltulas' ? `#${x.entry.number} · ` : ''}{tail(x.entry.name)}</b>
                  <small>{t(x.entry.categoryLabel)}{x.where.spot ? ` · ${t(x.where.spot)}` : ''}</small>
                </span>
                <Badges entry={x.entry} canBeAdult={state.canBeAdult} />
              </button>
            </li>
          ))}</ul>
        </section>
      ))}</div>

      <aside className="todo-side">{current && <TodoDetail key={current.entry.id} todo={current} canBeAdult={state.canBeAdult}
        onShowInChecklist={onShowInChecklist} onShowOnMap={MAP_CATEGORIES.has(current.entry.categoryId) ? onShowOnMap : undefined} />}</aside>
    </div>
  </div>;
}

function Badges({ entry, canBeAdult }: { entry: AvailableEntry; canBeAdult: boolean }) {
  return <span className="todo-badges">
    {canBeAdult && entry.ages.length === 1 && <span className={`age ${entry.ages[0]}`}>{t(entry.ages[0] === 'adult' ? 'Adulto' : 'Criança')}</span>}
    {entry.night && <span className="age night">{t('night')}</span>}
  </span>;
}

function TodoDetail({ todo, canBeAdult, onShowInChecklist, onShowOnMap }: { todo: Todo; canBeAdult: boolean; onShowInChecklist: (id: string) => void; onShowOnMap?: (id: string) => void }) {
  const { entry, item, where } = todo;
  const [shot, setShot] = useState(0);
  const floor = where.place && where.at ? where.place.maps.find(m => m.id === where.at!.map) : undefined;
  return <div className="todo-detail">
    <span className="marker-kind">{item && <GameItemIcon id={trackedItemIcon(item)} size={16} />}{t(entry.categoryLabel)} #{entry.number}</span>
    <h3>{t(item?.name ?? entry.name)}</h3>
    <p className="todo-place">{t(LOCAL_NAMES[where.region] ?? entry.region)}{where.spot && <> · {t(where.spot)}</>}</p>
    <Badges entry={entry} canBeAdult={canBeAdult} />

    {floor && where.at && <button type="button" className="todo-minimap" style={{ aspectRatio: String(floor.aspect ?? 1.6) }}
      onClick={() => onShowOnMap?.(entry.id)} disabled={!onShowOnMap} title={onShowOnMap ? t('Ver no mapa') : undefined}>
      {/* Zoomed in around the spot, which stays where it is on the floor map. */}
      <span className="todo-minimap-art" style={{ transformOrigin: `${where.at.x * 100}% ${where.at.y * 100}%` }}>
        <img src={floor.image} alt={t('Mapa da região')} draggable={false} />
        <i className="todo-pin" style={{ left: `${where.at.x * 100}%`, top: `${where.at.y * 100}%` }} />
      </span>
      {where.place && where.place.maps.length > 1 && <small className="todo-floor">{t(floor.label)}</small>}
    </button>}

    {!!where.photos.length && <div className="marker-photo todo-photo">
      <img src={where.photos[shot]} alt={t('Local no jogo')} />
      {where.photos.length > 1 && <>
        <button className="photo-nav prev" aria-label={t('Foto anterior')} onClick={() => setShot((shot + where.photos.length - 1) % where.photos.length)}>‹</button>
        <button className="photo-nav next" aria-label={t('Próxima foto')} onClick={() => setShot((shot + 1) % where.photos.length)}>›</button>
        <span className="photo-count">{shot + 1}/{where.photos.length}</span>
      </>}
    </div>}

    <h4>{t('Como conseguir')}</h4>
    <p>{item?.where ? t(item.where) : t('Sem descrição para este objetivo ainda.')}</p>
    {entry.note && <p className="todo-note">{t(entry.note)}</p>}

    {!!entry.uses?.length && <>
      <h4>{t('Você pode usar')}</h4>
      <div className="todo-uses">{entry.uses.map(u => { const icon = usesIcon(u); return <span key={u}>{icon && <GameItemIcon id={icon} size={18} />}{t(u)}</span>; })}</div>
    </>}
    {entry.unsure && <p className="todo-note">{t('A lógica deste objetivo ainda não foi confirmada.')}</p>}

    <div className="result-actions">
      <button className="action primary" onClick={() => onShowInChecklist(entry.id)}>{t('Ver na checklist')}</button>
      {onShowOnMap && <button className="action" onClick={() => onShowOnMap(entry.id)}>{t('Ver no mapa')}</button>}
      {item && item.state !== 'yes' && <button className="small-btn" onClick={() => void api.toggleManual(entry.id)}>{item.done ? t('Desmarcar') : t('Concluí')}</button>}
    </div>
  </div>;
}
