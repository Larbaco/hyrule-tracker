import { useMemo, useState, type ReactNode } from 'react';
import type { Activity, AppState, TrackedItem } from '../shared/types';
import { GUIDE, LOCAL_NAMES } from '../core/companion';
import { api } from './api';
import { enemyPhoto, regionPhoto } from './referenceImages';
import { LanguageSwitch } from './LanguageFlags';
import { currentLocale, date, hour, languages, number, t, type Locale } from './i18n';
import { ObjectiveName } from './ObjectiveName';
import { GameItemIcon, trackedItemIcon } from './GameItemIcon';
import { Minigames } from './Minigames';
import atlas from '../../data/atlas.json';
import { PhotoStudio, Quiz, Gossip, useStored } from './Recreation';
import './companion.css';

const pages = {
  overview: 'Visão geral', map: 'Mapa de Hyrule', checklist: 'Checklist 100%', threads: 'Fios do Tempo+',
  hall: 'Salão dos Inimigos', minigames: 'Minijogos', timeline: 'Registro do dia', medals: 'Meus dados',
  gossip: 'Missões de rumores', photo: 'Estúdio de fotos', quiz: 'Quiz diário', settings: 'Configurações',
};
export type Page = keyof typeof pages;
const pageDescriptions: Record<Page, string> = {
  overview: 'Veja o progresso da sua partida e retome a jornada.',
  map: 'Explore as regiões de Hyrule e localize os colecionáveis.',
  checklist: 'Acompanhe os objetivos que faltam para completar 100% do jogo.',
  threads: 'Acompanhe os capítulos da história e as missões secundárias.',
  hall: 'Confira as estátuas de inimigos, as revanches e as provações.',
  minigames: 'Veja os minijogos que você já venceu, os prêmios e os recordes da partida.',
  timeline: 'Consulte o progresso registrado pelo tracker ao longo de cada dia.',
  medals: 'Veja seus totais e os marcos conquistados na jornada.',
  gossip: 'Siga as pistas e fotografe as regiões indicadas.',
  photo: 'Explore os desafios de fotografia e organize suas capturas.',
  quiz: 'Teste seus conhecimentos sobre Hyrule no desafio diário.',
  settings: 'Configure o idioma, a origem da partida e a janela flutuante.',
};
const navGroups: Page[][] = [
  ['overview', 'map', 'checklist', 'threads', 'minigames', 'hall'],
  ['timeline', 'medals', 'gossip', /* 'photo' hidden for now */ 'quiz'],
  ['settings'],
];
const iconPaths: Record<string, string> = {
  overview: 'm3 11 9-8 9 8M5 10v10h5v-6h4v6h5V10',
  map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15',
  checklist: 'M9 5h12M9 12h12M9 19h12M3 5l1 1 2-2m-3 8 1 1 2-2m-3 8 1 1 2-2',
  threads: 'M4 4h16v16H4zM8 8h8m-8 4h8m-8 4h5',
  hall: 'M12 2 4 6v5c0 5 4 8 8 11 4-3 8-6 8-11V6zM9 12l2 2 4-4',
  minigames: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 5h.01',
  timeline: 'M12 8v5l3 2M3 12a9 9 0 1 0 2.6-6.4L3 8m0-4v4h4',
  medals: 'M8 3h8v6l-4 4-4-4zM12 13a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  gossip: 'M12 22s7-5 7-12a7 7 0 0 0-14 0c0 7 7 12 7 12Zm0-15v.1m0 3v4',
  photo: 'M3 6h4l2-3h6l2 3h4v14H3zm9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  quiz: 'M9 8a3 3 0 1 1 4.5 2.6c-1.5.8-1.5 1.5-1.5 3.4m0 4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
  settings: 'M3 6h7m4 0h7M3 12h12m4 0h2M3 18h2m4 0h12M10 4h4v4h-4zm5 6h4v4h-4zM5 16h4v4H5z',
  triangle: 'M12 3 2 21h20L12 3ZM7 12h10l-5 9z',
  refresh: 'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1',
};
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round"><path d={iconPaths[name] ?? iconPaths.triangle} /></svg>;
}

function sourceName(state: AppState) {
  return state.sourceLabel ?? (state.saveDir ? 'Partida local' : 'Aguardando partida');
}
function connectionStatus(state: AppState) {
  if (state.saveReadError) return { label: 'Falha ao ler o save', connected: false };
  if (state.status === 'ok' && state.summary) return {
    label: state.live.using ? 'Ao vivo' : 'Save conectado',
    detail: state.live.using ? undefined : 'Acompanhando o último save',
    connected: true,
  };
  if (state.status === 'loading' || state.live.status === 'searching') {
    return { label: 'Buscando conexão', connected: false };
  }
  return { label: 'Sem partida', connected: false };
}

export function Sidebar({ page, onPage, state }: { page: Page; onPage: (p: Page) => void; state: AppState }) {
  const connection = connectionStatus(state);
  return <aside className="tracker-sidebar">
    <div className="tracker-brand"><img className="brand-icon" src="./brand/icon.webp" alt="" /><div><strong>Hyrule Tracker</strong><small>Ocarina of Time</small></div></div>
    <button className={connection.connected ? 'sidebar-source connected' : 'sidebar-source'} title={t(connection.detail ?? connection.label)} onClick={() => onPage('settings')}>
      <span className="status-dot" aria-hidden="true" />
      <b>{t(sourceName(state))}</b>
      <small>{t(connection.label)}</small>
    </button>
    <nav aria-label={t("Menu principal")}>{navGroups.map((group, index) => <div className="nav-group" key={index}>{group.map(p =>
      <button key={p} type="button" title={t(pages[p])} aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}><Icon name={p} size={17} /><span>{t(pages[p])}</span></button>,
    )}</div>)}</nav>
    <div className="sidebar-footer">v{state.version}</div>
  </aside>;
}

export function PageHeader({ page, state, headerActions }: { page: Page; state: AppState; headerActions: ReactNode }) {
  const connection = connectionStatus(state);
  return <header className="page-header">
    <div><h1>{t(pages[page])}</h1><p className="page-description">{t(pageDescriptions[page])}</p></div>
    <div className="page-header-actions">
      <span className={connection.connected ? 'connection connected' : 'connection'} title={connection.detail && t(connection.detail)} role="status"><i aria-hidden="true" />{t(connection.label)}</span>
      {headerActions}
    </div>
  </header>;
}

const value = (n: number | null | undefined) => n == null ? '—' : number(n);

function saveActions(onScan: () => void, scanning: boolean) {
  return <div className="page-actions">
    <button className="action primary" disabled={scanning} onClick={onScan}>{scanning ? t('Buscando…') : t('Buscar saves')}</button>
    <button className="action" onClick={() => void api.browseFolder()}>{t("Escolher pasta")}</button>
  </div>;
}

export function CompanionPage({ page, state, onPage, onScan, scanning, onLanguage, headerActions }: { page: Page; state: AppState; onPage: (page: Page) => void; onScan: () => void; scanning: boolean; onLanguage: (locale: Locale) => void; headerActions: ReactNode }) {
  const view = {
    overview: <Overview state={state} onPage={onPage} onScan={onScan} scanning={scanning} />,
    checklist: <Overview state={state} onPage={onPage} onScan={onScan} scanning={scanning} />,
    map: <HyruleMap state={state} />,
    threads: <Threads state={state} />,
    hall: <Hall state={state} />,
    minigames: <Minigames state={state} />,
    timeline: <Timeline state={state} />,
    medals: <Medals state={state} />,
    gossip: <Gossip state={state} />,
    photo: <PhotoStudio state={state} />,
    quiz: <Quiz />,
    settings: <Settings state={state} onScan={onScan} scanning={scanning} onLanguage={onLanguage} />,
  };
  return <main className="companion-page" key={page}><PageHeader page={page} state={state} headerActions={headerActions} />{view[page]}</main>;
}

function Overview({ state, onPage, onScan, scanning }: { state: AppState; onPage: (p: Page) => void; onScan: () => void; scanning: boolean }) {
  const s = state.summary;
  if (!s) return <section className="focus-panel empty-state">
    <img className="brand-icon big" src="./brand/icon.webp" alt="" /><h2>{state.status === 'loading' ? t('Buscando sua partida') : t('Encontre a sua partida')}</h2>
    <p>{t(state.message || 'Procurando saves do remake nos locais de instalação.')}</p>
    {state.status !== 'loading' && saveActions(onScan, scanning)}
  </section>;
  const chests = state.categories.find(c => c.id === 'chests');
  const metrics = [
    { label: 'Corações', icon: 'heart', count: s.hearts, max: 20, detail: s.heartPiecesHeld == null ? 'Capacidade máxima' : `${s.heartPiecesHeld}/4 ${t('pedaços para o próximo')}` },
    { label: 'Skulltulas douradas', icon: 'gold_skulltula', count: s.tokens, max: 100, detail: s.claimable.length ? 'Recompensa disponível' : s.nextReward ? `${t('Próxima recompensa aos')} ${s.nextReward.tokens}` : 'Todas as recompensas alcançadas' },
    { label: 'Baús abertos', icon: 'chest', count: chests?.done, max: chests?.total, detail: 'Exploração de Hyrule' },
    { label: 'Rupees', icon: 'rupee', count: state.companion?.rupees, detail: 'Saldo atual' },
  ];
  const artwork = state.saveImage || regionPhoto('HyruleField')?.file;
  return <>
    <section className={artwork ? 'focus-panel progress-panel has-photo' : 'focus-panel progress-panel'}>
      {artwork && <img className="progress-photo" src={artwork} alt="" />}
      <div className="progress-copy">
        <h2>{t("Progresso da jornada")}</h2>
        <div className="big-progress">{value(s.percent)}<span>%</span></div>
        <progress aria-label={t("Progresso do checklist")} value={s.percent} max={100} />
        <p>{s.doneA} {t("de")} {s.totalA} {t("objetivos concluídos")}</p>
        <button className="action primary" onClick={() => onPage('checklist')}>{t("Abrir checklist")}</button>
      </div>
      <div className="progress-place">{t(s.area || sourceName(state))}<small>{s.lastSavedMs ? date(s.lastSavedMs) : t('Último save')}</small></div>
    </section>
    <section className="metric-strip" aria-label={t("Resumo da partida")}>
      {metrics.map(m => <div className="metric" key={m.label}><span className="metric-label"><GameItemIcon id={m.icon} size={25} />{t(m.label)}</span><strong>{value(m.count)}{m.max != null && <small>/{m.max}</small>}</strong><span>{t(m.detail)}</span></div>)}
    </section>
    <div className="home-grid">
      <section className="focus-panel"><div className="section-line"><h2>{t("Fios do Tempo+")}</h2><button className="text-action" onClick={() => onPage('threads')}>{t("Ver jornada")}</button></div>
        <div className="chapter-list">{state.companion?.chapters.map(c => <div className="chapter-line" key={c.id}>
          <span className={c.stages.every(t => t.done) ? 'story-dot done' : 'story-dot'} /><b><ObjectiveName done={c.stages.every(stage => stage.done)}>{t(c.title)}</ObjectiveName></b><small>{c.stages.filter(t => t.done).length}/{c.stages.length}</small>
        </div>)}</div>
      </section>
      <section className="focus-panel"><div className="section-line"><h2>{t("Atividade recente")}</h2><button className="text-action" onClick={() => onPage('timeline')}>{t("Abrir registro")}</button></div>
        {(state.activity ?? []).length ? <ActivityList activity={(state.activity ?? []).slice(0, 3)} /> : <p className="quiet">{t("Os próximos avanços aparecerão aqui durante a partida.")}</p>}
      </section>
    </div>
  </>;
}

function Settings({ state, onScan, scanning, onLanguage }: { state: AppState; onScan: () => void; scanning: boolean; onLanguage: (locale: Locale) => void }) {
  return <>
    <section className="focus-panel setting-panel"><h2>{t("Idioma")}</h2><LanguageSwitch locale={currentLocale()} onChange={onLanguage} labelled /></section>
    <section className="focus-panel setting-panel">
      <h2>{t("Fonte da partida")}</h2>
      <p>{t(sourceName(state))}</p>
      <code className="save-path">{state.saveDir || t('Pasta do save ainda não encontrada.')}</code>
      {state.message && <p className="notice" role="status">{t(state.message)}</p>}
      {saveActions(onScan, scanning)}
      {!!state.slots.length && <label className="inline-field">{t('Slot')}<select value={state.slotMode === 'manual' ? state.activeSlot : ''} onChange={e => void api.pinSlot(e.target.value || null)}>
        <option value="">{t("Seguir o save mais recente")}</option>
        {state.slots.map(slot => <option key={slot.name} value={slot.name}>{slot.name} · {t(slot.area ?? '?')} · {date(slot.mtimeMs)}</option>)}
      </select></label>}
    </section>
    <section className="focus-panel setting-panel"><h2>{t("Rastreamento")}</h2>
      <label className="inline-field"><input type="checkbox" checked={state.live.enabled} onChange={e => void api.setLive(e.target.checked)} />{t("Atualizar ao vivo enquanto o jogo estiver aberto")}</label>
      <label className="inline-field"><input type="checkbox" checked={state.changeLog.enabled} onChange={e => void api.setChangeLog(e.target.checked)} />{t("Guardar o registro de atividade neste PC")}</label>
      <label className="inline-field"><input type="checkbox" checked={state.captureActivity ?? true} onChange={e => void api.setCaptureActivity(e.target.checked)} />{t("Fotografar a janela do jogo nos marcos da jornada")}</label>
      {state.slotMode === 'manual' && <p className="notice">{t("Slot fixado. Selecione o save mais recente para voltar ao modo ao vivo.")}</p>}
      <button className="action" onClick={() => void api.toggleOverlay()}>{state.overlay.visible ? t('Ocultar painel no jogo') : t('Mostrar painel no jogo')}</button>
    </section>
    <section className="focus-panel setting-panel"><h2>{t("Referências")}</h2><div className="page-actions"><a className="action" target="_blank" rel="noreferrer" href={GUIDE}>{t("Guia de 100%")}</a><a className="action" target="_blank" rel="noreferrer" href="https://www.nintendo.com/en-gb/Games/Smart-device-games/ZELDA-NOTES-2790439.html">Zelda Notes</a><a className="action" target="_blank" rel="noreferrer" href="https://zelda.mtwildwood.net/en-gb/">{t("Créditos das imagens")}</a></div></section>
  </>;
}

const atlasStages: Record<string, string> = {
  kokiri: 'KokiriForest', perdido: 'LostWood', prado: 'SacredForestMeadow', llanura: 'HyruleField',
  lonlon: 'LonLonRanch', ciudadela: 'Market', castillo: 'HyruleCastle', kakariko: 'KakarikoVillage', cementerio: 'Graveyard',
  sendero: 'DeathMountainTrail', goron: 'GoronCity', crater: 'DeathMountainCrater', rio: 'ZoraRiver',
  dominio: 'ZoraDomain', fuente: 'ZoraFountain', lago: 'LakeHylia', valle: 'GerudoValley',
  fortaleza: 'GerudoFortress', desierto: 'HountedWasteland', coloso: 'DesertColossus',
  deku: 'InsideTheDekuTree', dodongos: 'DodongoCavern', jabu: 'InsideJabuJabuBelly',
  bosque: 'ForestTemple', fuego: 'FireTemple', agua: 'WaterTemple', sombra: 'ShadowTemple',
  espiritu: 'SpiritTemple', pozo: 'BottomOfTheWell', hielo: 'IceCavern', gerudo: 'GerudoTrainingGround', ganon: 'InsideGanonCastle',
};
const atlasCategories: Record<string, string> = {
  gs: 'gold_skulltulas', heart: 'heart_pieces', container: 'heart_containers', bean: 'bean_spots', fairy: 'great_fairies',
  bottle: 'bottles', thought: 'fairy_thoughts',
};
const atlasIcons: Record<string, string> = {
  gs: 'gold_skulltula', heart: 'heart_piece', container: 'heart_container', bean: 'magic_bean', bottle: 'bottle',
};
const englishAliases: Record<string, string[]> = {
  InsideTheDekuTree: ['deku tree', 'great deku tree'], InsideJabuJabuBelly: ['jabu', "lord jabu-jabu's belly"],
  HountedWasteland: ['haunted wasteland', 'mirage desert'], Market: ['hyrule castle town', 'castle town'],
  DodongoCavern: ["dodongo's cavern"], HyruleCastle: ['outside ganon’s castle'],
  LostWood: ['lost woods', 'lost wood'], TimeTemple: ['temple of time'], GerudoTrainingGround: ['gerudo training ground', 'gerudo proving grounds'],
  BottomOfTheWell: ['bottom of the well'], DeathMountainTrail: ['death mountain trail'], ZoraDomain: ["zora's domain"],
  ZoraRiver: ["zora's river"], ZoraFountain: ["zora's fountain"], SacredForestMeadow: ['sacred grove'],
};
export function HyruleMap({ state }: { state: AppState }) {
  const [region, setRegion] = useState('HyruleField');
  const [era, setEra] = useState<'all' | 'child' | 'adult'>('all');
  const [filter, setFilter] = useState('all');
  const [hideDone, setHideDone] = useState(false);
  const [hideUnknown, setHideUnknown] = useStored('map.hideUnknown', false);
  const [follow, setFollow] = useState(false);
  const [active, setActive] = useState<TrackedItem>();
  const normalize = (s: string) => s.normalize('NFD').toLowerCase().replace(/ \(.+\)$/, '').replace(/[^a-z0-9]/g, '');
  const findRegion = (name: string) => Object.keys(LOCAL_NAMES).find(k =>
    normalize(k) === normalize(name) || normalize(LOCAL_NAMES[k]) === normalize(name) || englishAliases[k]?.some(a => normalize(a) === normalize(name)),
  );
  const inGame = findRegion(state.summary?.area?.replace(/ \(.+\)$/, '') ?? '');
  const selected = follow && inGame ? inGame : region;
  const seen = new Set([...(state.companion?.visited ?? []), ...(inGame ? [inGame] : [])]);
  const categories = state.categories.filter(c => ['heart_pieces', 'heart_containers', 'gold_skulltulas', 'chests', 'great_fairies', 'bottles', 'fairy_thoughts', 'scarecrow_spots', 'grottos', 'minigames', 'side_events', 'bean_spots', 'big_poe_spots', 'gossip_stones', 'silver_rupees', 'cow_rewards'].includes(c.id));
  const places = useMemo(() => new Map(Object.entries(state.placements ?? {}).flatMap(([id, rows]) =>
    rows.map(c => [id + '.0x' + c.hash.toString(16), c] as const))), [state.placements]);
  const localItems = categories.flatMap(cat => cat.items.filter(item => {
    const chest = places.get(item.id);
    const area = chest ? chest.stage || 'unknown' : findRegion(item.chapter ?? item.logic?.region ?? '');
    const ages = item.logic?.ages ?? [];
    return area === selected && (era === 'all' || (chest ? !chest.era || chest.era === era : !ages.length || ages.includes(era)));
  }).map(item => ({ item, cat })));
  const visible = localItems.filter(({ item, cat }) => (!hideDone || !item.done) && (filter === 'all' || filter === cat.id));
  const points = localItems.flatMap(({ item }) => { const c = places.get(item.id); return c?.x != null && c.z != null ? [{ item, x: c.x, z: c.z }] : []; });
  const plotted = points.filter(p => visible.some(v => v.item.id === p.item.id));
  const box = { minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)), minZ: Math.min(...points.map(p => p.z)), maxZ: Math.max(...points.map(p => p.z)) };
  function select(k: string) { setRegion(k); setFollow(false); setActive(undefined); }
  const showLocation = !hideUnknown || seen.has(selected);
  const photo = showLocation ? regionPhoto(selected) : undefined;
  const selectItem = (item: TrackedItem) => setActive(item.id === active?.id ? undefined : item);
  const activeItem = localItems.find(({ item }) => active?.id === item.id)?.item;
  return <>
    <div className="filter-bar">
      <label>{t("Região")}{' '}<select value={selected} onChange={e => select(e.target.value)}>{Object.entries(LOCAL_NAMES).filter(([key]) => !hideUnknown || seen.has(key) || key === selected).map(([key, name]) => <option key={key} value={key}>{t(name)}</option>)}{!hideUnknown && <option value="unknown">{t("Baús sem posição mapeada")}</option>}</select></label>
      <label>{t("Era")}{' '}<select value={era} onChange={e => setEra(e.target.value as typeof era)}><option value="all">{t("Todas")}</option><option value="child">{t("Criança")}</option><option value="adult">{t("Adulto")}</option></select></label>
      <label><input type="checkbox" checked={hideUnknown} onChange={e => setHideUnknown(e.target.checked)} />{t("Ocultar regiões não vistas")}</label>
      <label><input type="checkbox" checked={follow} onChange={e => { setFollow(e.target.checked); setActive(undefined); }} />{t("Seguir Link")}</label>
    </div>
    <div className="map-layout">
      <section className="focus-panel map-panel">
        <div className="world-map" aria-label={t("Mapa de Hyrule")} style={{ aspectRatio: atlas.map.width / atlas.map.height }}>
          <img className="map-art" src={atlas.map.image} alt="" />
          {atlas.places.filter(place => !hideUnknown || seen.has(atlasStages[place.id])).map(place => {
            const key = atlasStages[place.id];
            const label = t(LOCAL_NAMES[key] ?? place.name);
            return <button key={key} className="map-node" style={{ left: `${place.pin.x * 100}%`, top: `${place.pin.y * 100}%` }} aria-pressed={key === selected} title={label} aria-label={label} onClick={() => select(key)}><i className={key === inGame ? 'in-game' : ''} /><span>{label}</span></button>;
          })}
        </div>
        <p className="map-caption">{state.live.using ? t('região atual ao vivo') : t('região no último save')}</p>
        {showLocation && selected !== 'unknown' && <RegionAtlas key={selected} region={selected} state={state} era={era} filter={filter} hideDone={hideDone} />}
      </section>
      <section className="focus-panel map-results">
        {photo && <img className="region-photo" src={photo.file} alt={t(LOCAL_NAMES[selected])} />}
        <div className="section-line"><h2>{selected === 'unknown' ? t('Baús sem posição') : t(LOCAL_NAMES[selected])}</h2>{showLocation && <b>{localItems.filter(({ item }) => item.done).length}/{localItems.length}</b>}</div>
        <div className="filter-bar compact"><label>{t("Coletáveis")}{' '}<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">{t("Todos")}</option>{categories.map(c => <option key={c.id} value={c.id}>{t(c.label)}</option>)}</select></label>
        <label><input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} />{t("Só pendentes")}</label></div>
        {showLocation && !!plotted.length && <div className="local-plot" aria-label={t("Posições dos itens na região")}>{plotted.map(p =>
          <button key={p.item.id} aria-label={`${t(p.item.name)} · ${t(p.item.done ? 'Coletado' : 'Pendente')}`} aria-pressed={active?.id === p.item.id} className={p.item.done ? 'plot-point done' : 'plot-point'} style={{ left: `${10 + (p.x - box.minX) / (box.maxX - box.minX || 1) * 80}%`, top: `${10 + (p.z - box.minZ) / (box.maxZ - box.minZ || 1) * 80}%` }} onClick={() => selectItem(p.item)}><GameItemIcon id={trackedItemIcon(p.item)} size={14} /></button>,
        )}</div>}
        {activeItem && <div className="notice"><p><ObjectiveName done={activeItem.done}>{t(activeItem.name)}</ObjectiveName>{activeItem.where ? ` · ${t(activeItem.where)}` : ''}</p>
          {(activeItem.state === 'unmapped' || activeItem.manual) && <button className="action" onClick={() => void api.toggleManual(activeItem.id)}>{activeItem.done ? t('Desmarcar') : t('Concluí')}</button>}</div>}
        {!showLocation ? <p className="quiet">{t("Visite a região para ver os itens.")}</p> : visible.length ? <div className="result-list">{visible.map(({ item, cat }) => <button key={item.id} aria-pressed={item.id === active?.id} onClick={() => selectItem(item)}><span className={item.done ? 'story-dot done' : 'story-dot'} /><span><ObjectiveName done={item.done}>{t(item.name)}</ObjectiveName><small>{t(cat.label)} · {item.done ? t('Coletado') : item.state === 'unknown' || item.state === 'unmapped' ? t('Situação não mapeada') : t('Pendente')}</small></span></button>)}</div> : <p className="quiet">{t("Nenhum item para este filtro.")}</p>}
      </section>
    </div>
  </>;
}

function RegionAtlas({ region, state, era, filter, hideDone }: { region: string; state: AppState; era: string; filter: string; hideDone: boolean }) {
  const place = atlas.places.find(p => atlasStages[p.id] === region);
  const [floor, setFloor] = useState(place?.startMap ?? '');
  const [active, setActive] = useState('');
  const [shot, setShot] = useState(0);
  if (!place) return null;
  const status = state.atlasStatus ?? {};
  const currentFloor = place.maps.find(map => map.id === floor) ?? place.maps[0];
  const markers = atlas.items.filter(item => item.place === place.id && (filter === 'all' || atlasCategories[item.cat] === filter) &&
    (era === 'all' || !item.age || item.age === 'both' || item.age === era) && (!hideDone || status[item.id] !== 'done'));
  const selected = markers.find(item => item.id === active);
  const select = (id: string) => { setActive(id); setShot(0); };
  const statusLabel = (id: string) => t(status[id] === 'done' ? 'Coletado' : status[id] === 'todo' ? 'Pendente' : 'Situação não mapeada');
  return <div className="region-atlas">
    <div className="section-line"><h2>{t("Mapa da região")}</h2>
      {place.maps.length > 1 && <label className="inline-field">{t("Andar / era")}<select value={currentFloor.id} onChange={e => { setFloor(e.target.value); select(''); }}>{place.maps.map(m => <option key={m.id} value={m.id}>{t(m.label)}</option>)}</select></label>}
    </div>
    {currentFloor && <div className="floor-map" style={{ aspectRatio: currentFloor.aspect ?? 1.6 }} aria-label={t("Mapa da região")}>
      <img className="map-art" src={currentFloor.image} alt="" />
      {markers.filter(m => m.at?.map === currentFloor.id).map(m =>
        <button key={m.id} title={`${t(m.name)} · ${statusLabel(m.id)}`} aria-label={`${t(m.name)} · ${statusLabel(m.id)}`} aria-pressed={active === m.id} className={status[m.id] === 'done' ? 'plot-point done' : 'plot-point'} style={{ left: `${m.at!.x * 100}%`, top: `${m.at!.y * 100}%` }} onClick={() => select(m.id)}><GameItemIcon id={atlasIcons[m.cat]} size={14} /></button>,
      )}
    </div>}
    {!!markers.length && <label className="inline-field">{t("Mostrar local")}<select value={selected ? active : ''} onChange={e => {
      const next = markers.find(m => m.id === e.target.value);
      if (next?.at?.map) setFloor(next.at.map);
      select(e.target.value);
    }}><option value="">{t("Escolha um marcador")}</option>{markers.map(m => <option key={m.id} value={m.id} className={status[m.id] === 'done' ? 'completed-title' : undefined}>{status[m.id] === 'done' && '✓ '}{t(m.name)}</option>)}</select></label>}
    {selected && <div className="atlas-item">
      <div className="section-line"><h3><ObjectiveName done={status[selected.id] === 'done'}>{t(selected.name)}</ObjectiveName></h3><span>{statusLabel(selected.id)}</span></div>
      {!!selected.images.length && <img src={selected.images[shot]} alt={t("Local no jogo")} />}
      {selected.images.length > 1 && <div className="page-actions"><button className="action" onClick={() => setShot((shot + selected.images.length - 1) % selected.images.length)}>{t("Foto anterior")}</button><button className="action" onClick={() => setShot((shot + 1) % selected.images.length)}>{t("Próxima foto")}</button></div>}
    </div>}
  </div>;
}

function Threads({ state }: { state: AppState }) {
  const [videos, setVideos] = useState<Record<string, string>>({});
  const chapters = state.companion?.chapters ?? [];
  const side = state.categories.find(c => c.id === 'side_quests');
  return <div className="story-grid">
    <section className="focus-panel"><h2>{t("História principal")}</h2>
      {chapters.length ? chapters.map(c => <details className="story-chapter" key={c.id}>
        <summary><span className={c.stages.every(s => s.done) ? 'story-dot done' : 'story-dot'} /><ObjectiveName done={c.stages.every(s => s.done)}>{t(c.title)}</ObjectiveName><small>{c.stages.filter(s => s.done).length}/{c.stages.length}</small></summary>
        <ul>{c.stages.map(s => <li key={s.label}><span><ObjectiveName done={s.done}>{t(s.label)}</ObjectiveName></span><small>{s.done ? t('Concluído') : s.started ? t('Em andamento') : t('Aguardando')}</small></li>)}</ul>
        <label className="action file-action">{t("Abrir cena gravada")}<input type="file" accept="video/*" onChange={e => {
          const file = e.target.files?.[0]; if (!file) return;
          if (videos[c.id]) URL.revokeObjectURL(videos[c.id]);
          setVideos(prev => ({ ...prev, [c.id]: URL.createObjectURL(file) }));
        }} /></label>
        {!!videos[c.id] && <video controls src={videos[c.id]} />}
      </details>) : <p className="quiet">{t("Encontre um save para ver a história.")}</p>}
    </section>
    <section className="focus-panel"><h2>{t("Missões secundárias")}{' '}{side && <small>{side.done}/{side.total}</small>}</h2>
      {side?.items.map(i => <div className="chapter-line" key={i.id}><span className={i.done ? 'story-dot done' : 'story-dot'} /><b><ObjectiveName done={i.done}>{t(i.name)}</ObjectiveName></b></div>)}
    </section>
  </div>;
}

function Hall({ state }: { state: AppState }) {
  const [tab, setTab] = useState('statues');
  const cat = state.categories.find(c => c.id === tab);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string>();
  const highlighted = cat?.items.find(item => item.id === selected);
  const highlightedPhoto = highlighted ? enemyPhoto(highlighted.id, highlighted.name) : undefined;
  return <section className="focus-panel hall-panel">
    <div className="section-line"><h2>{t(cat?.label ?? 'Salão dos Inimigos')}</h2>{cat && <b>{cat.done}/{cat.total}</b>}</div>
    <div className="segment">{[['statues','Estátuas'],['rematches','Revanches'],['trials','Provações']].map(([id,label]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{t(label)}</button>)}</div>
    {tab !== 'trials' && <label className="inline-field">{t("Buscar inimigo")}<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>}
    {highlightedPhoto && <div className="enemy-focus"><img src={highlightedPhoto.file} alt={highlighted?.name} /><div><h3><ObjectiveName done={highlighted?.done}>{highlighted?.name}</ObjectiveName></h3><span>{highlighted?.done ? t('Obtido') : t('Pendente')}</span></div><button className="action" onClick={() => setSelected(undefined)}>{t("Fechar")}</button></div>}
    <div className="hall-list">{cat?.items.filter(i => tab === 'trials' || i.name.toLowerCase().includes(query.toLowerCase())).map(i => {
      const trial = state.companion?.trials.find(t => i.id.endsWith('.' + t.id));
      const rematch = state.companion?.rematches.find(r => r.id === i.id);
      const frames = trial?.frames ?? rematch?.frames;
      const photo = enemyPhoto(i.id, i.name);
      return <div className="hall-row" key={i.id}><span className={i.done ? 'story-dot done' : 'story-dot'} />{photo && <button className="enemy-thumb" aria-label={i.name} onClick={() => setSelected(i.id)}><img src={photo.file} alt="" loading="lazy" /></button>}<b><ObjectiveName done={i.done}>{t(i.name)}</ObjectiveName></b>
        <span>{i.done && frames != null && frames > 0 && frames < 216000 ? `${t('Recorde')} · ${number(frames / 60)} s` : i.done ? t('Concluído') : i.state === 'unknown' ? t('Indisponível') : t('Pendente')}</span>
      </div>;
    })}</div>
    {!cat && <p className="quiet">{t("Encontre um save para ver o Salão.")}</p>}
  </section>;
}

function dayStamp(ts = Date.now()) { const d = new Date(ts); return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map(n => String(n).padStart(2, '0')).join('-'); }
function activityText(a: Activity) {
  return [...(a.hearts ? [`+${a.hearts} ${t('Corações')}`] : []), ...(a.pieces ? [`+${a.pieces} ${t('Pieces of Heart')}`] : []),
    ...a.entries.slice(0, 4).map(t), ...(a.enemies ? [`+${a.enemies} ${t('inimigos')}`] : []), ...(a.rupees ? [`+${a.rupees} ${t('Rupees')}`] : [])].join(' · ');
}
function ActivityList({ activity, photos = false }: { activity: Activity[]; photos?: boolean }) {
  return <ol className="activity-list">{activity.map((a, index) => <li key={`${a.ms}-${index}`}>
    <time>{hour(a.ms)}</time><div><b>{activityText(a)}</b><small>{t(a.area ?? 'Hyrule')} · {t(a.source === 'live' ? 'Ao vivo' : 'Último save')}</small></div>
    {photos && a.screenshot && <img src={a.screenshot} alt={t("Captura do momento")} />}
  </li>)}</ol>;
}
function Timeline({ state }: { state: AppState }) {
  const [day, setDay] = useState(dayStamp);
  const events = (state.activity ?? []).filter(a => dayStamp(a.ms) === day);
  const totals = events.reduce((a, e) => [a[0] + (e.enemies ?? 0), a[1] + (e.rupees ?? 0), a[2] + (e.pieces ?? 0)], [0, 0, 0]);
  return <section className="focus-panel"><div className="section-line"><h2>{t("Atividade da partida")}</h2><label className="inline-field">{t("Dia")}{' '}<input type="date" value={day} onChange={e => setDay(e.target.value)} /></label></div>
    <div className="timeline-stats"><span><b>{totals[0]}</b>{t("inimigos contabilizados")}</span><span><b><GameItemIcon id="rupee" /> {totals[1]}</b>{t("rupees de ganhos observados")}</span><span><b><GameItemIcon id="heart_piece" /> {totals[2]}</b>{t("pedaços registrados")}</span></div>
    {events.length ? <ActivityList activity={events} photos /> : <p className="quiet">{t("Nenhum avanço foi registrado neste dia com o tracker aberto.")}</p>}
  </section>;
}

function Medals({ state }: { state: AppState }) {
  const s = state.summary;
  const chests = state.categories.find(c => c.id === 'chests');
  const statues = state.categories.find(c => c.id === 'statues');
  const milestones = [
    ['Corações', s?.hearts, [5,10,15,20]], ['Skulltulas douradas', s?.tokens, [10,30,50,100]],
    ['Baús abertos', chests?.done, [20,50,100,chests?.total ?? 206]], ['Estátuas', statues?.done, [20,40,60,84]],
    ['Inimigos derrotados', state.companion?.enemies, [50,100,250,500]], ['Checklist (%)', s?.percent, [25,50,75,100]],
  ] as const;
  return <section className="focus-panel"><h2>{t("Medalhas da jornada")}</h2><p className="quiet">{t("Marcos locais calculados a partir do seu progresso.")}</p>
    <div className="medal-list">{milestones.map(([name, n, thresholds]) => <div className="medal-row" key={name}>
      <div><b>{t(name)}</b><small>{value(n)}</small></div>{thresholds.map(x => {
        const earned = n != null && n >= x;
        return <span className={earned ? 'medal earned' : 'medal'} key={x} title={t(earned ? 'Medalha conquistada' : 'Medalha pendente')}><Icon name="medals" /><ObjectiveName done={earned}>{x}</ObjectiveName></span>;
      })}
    </div>)}</div>
  </section>;
}
