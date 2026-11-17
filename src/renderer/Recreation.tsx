import { date, t } from './i18n';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { AppState } from '../shared/types';
import { api } from './api';
import { regionPhoto, quizImages } from './referenceImages';
import { ObjectiveName } from './ObjectiveName';
import { GameItemIcon, trackedItemIcon } from './GameItemIcon';

const prefix = 'hyrule-tracker.';
const day = () => new Intl.DateTimeFormat('sv-SE').format(new Date());
export function useStored<T>(key: string, initial: T) {
  const read = () => {
    try { const raw = localStorage.getItem(prefix + key); return raw ? JSON.parse(raw) as T : initial; }
    catch { return initial; }
  };
  const [item, setItem] = useState<{ key: string; value: T }>(() => ({ key, value: read() }));
  const value = item.key === key ? item.value : read();
  const change = (next: T | ((value: T) => T)) => {
    const updated = typeof next === 'function' ? (next as (v: T) => T)(value) : next;
    try { localStorage.setItem(prefix + key, JSON.stringify(updated)); } catch { /* quota or unavailable storage */ }
    setItem({ key, value: updated });
  };
  return [value, change] as const;
}

const makeQr = (text: string, width = 220) => QRCode.toDataURL(text, { width, margin: 2, errorCorrectionLevel: 'M' });
function download(data: string, name: string) {
  const a = document.createElement('a');
  a.href = data;
  a.download = name;
  a.click();
}
async function bitmap(url: string) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

type Note = 0 | 1 | 2 | 3 | 4;
type Melody = { title: string; notes: Note[] };
const noteNames = ['Ré', 'Fá', 'Lá', 'Si', 'Ré agudo'];
const noteKeys = ['A', 'S', 'D', 'F', 'G'];
const pitches = [293.66, 349.23, 440, 493.88, 587.33];
const songBook: Melody[] = [
  { title: 'Canção de ninar de Zelda', notes: [2,4,3,2,4,3] },
  { title: 'Canção de Epona', notes: [4,2,3,4,2,3] },
  { title: 'Canção de Saria', notes: [1,3,2,1,3,2] },
  { title: 'Canção do Sol', notes: [3,1,4,3,1,4] },
  { title: 'Canção do Tempo', notes: [3,0,1,3,0,1] },
  { title: 'Canção das Tempestades', notes: [0,1,4,0,1,4] },
  { title: 'Minueto da Floresta', notes: [0,4,2,3,2,3] },
  { title: 'Bolero do Fogo', notes: [1,0,1,0,3,1,3,1] },
  { title: 'Serenata da Água', notes: [0,1,3,3,2] },
  { title: 'Réquiem dos Espíritos', notes: [0,1,0,3,1,0] },
  { title: 'Noturno das Sombras', notes: [2,3,3,0,2,3,1] },
  { title: 'Prelúdio da Luz', notes: [4,3,4,3,2,4] },
];
const bonusSongs: Melody[] = [
  { title: 'Caminho de Hyrule', notes: [0,1,2,4,3,2,1,0] },
  { title: 'Estrelas de Kokiri', notes: [2,4,3,2,1,2,1,0] },
];
const melodyCode = (song: Melody) => 'hyrule-ocarina-v1:' + song.notes.join('');
function parseMelody(code: string): Note[] | undefined {
  const match = /^hyrule-ocarina-v1:([0-4]{1,64})$/.exec(code.trim());
  return match ? Array.from(match[1], n => Number(n) as Note) : undefined;
}

export function Ocarina() {
  const [recorded, setRecorded] = useStored<Melody[]>('melodies', []);
  const [wallet, setWallet] = useStored('gossip.points', 0);
  const [unlocked, setUnlocked] = useStored<string[]>('gossip.scores', []);
  const [mode, setMode] = useState<'free' | 'guided' | 'demo'>('free');
  const [selection, setSelection] = useState(songBook[0].title);
  const [sequence, setSequence] = useState<Note[]>([]);
  const [cursor, setCursor] = useState(0);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [qr, setQr] = useState('');
  const audio = useRef<AudioContext | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const songs = [...songBook, ...bonusSongs.filter(s => unlocked.includes(s.title)), ...recorded];
  const song = songs.find(s => s.title === selection) ?? songs[0];
  const play = (note: Note) => {
    const ctx = audio.current ??= new AudioContext();
    void ctx.resume();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = pitches[note];
    oscillator.type = 'sine';
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.032);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.33);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(t);
    oscillator.stop(t + 0.34);
  };
  const notePress = (note: Note) => {
    play(note);
    if (mode === 'free') { setSequence(previous => previous.length < 64 ? [...previous, note] : previous); setQr(''); }
    if (mode === 'guided') {
      if (cursor >= song.notes.length) return;
      if (song.notes[cursor] === note) { setCursor(cursor + 1); setMessage(cursor + 1 === song.notes.length ? 'Melodia concluída.' : ''); }
      else setMessage('Tente a nota destacada.');
    }
  };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || (event.target as HTMLElement)?.closest('input, textarea, select')) return;
      const index = noteKeys.indexOf(event.key.toUpperCase());
      if (index >= 0 && mode !== 'demo') notePress(index as Note);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  });
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => { stop(); void audio.current?.close(); }, []);
  const reset = () => { stop(); setCursor(0); setMessage(''); setQr(''); };
  function save() {
    const label = title.trim();
    if (!label || !sequence.length) return setMessage('Dê um nome à melodia e toque pelo menos uma nota.');
    if (songs.some(s => s.title === label)) return setMessage('Esse título já está na lista.');
    setRecorded(p => [...p, { title: label, notes: sequence }]); setSelection(label); setMessage('Melodia guardada.');
  }
  return <div className="story-grid">
    <section className="focus-panel"><h2>{t("Ocarina digital")}</h2>
      <div className="segment">{([['free','Livre'],['guided','Guiado'],['demo','Demonstração']] as const).map(([id,label]) =>
        <button key={id} aria-pressed={mode === id} onClick={() => { reset(); setMode(id); }}>{label}</button>)}</div>
      {mode !== 'free' && <label className="inline-field">{t("Partitura")}<select value={selection} onChange={e => { reset(); setSelection(e.target.value); }}>{songs.map(s => <option key={s.title} value={s.title}>{t(s.title)}</option>)}</select></label>}
      <div className="note-strip" aria-label={t("Sequência de notas")}>{(mode === 'free' ? sequence : song.notes).map((note,i) => <span className={mode !== 'free' && i === cursor ? 'next' : ''} key={i}>{t(noteNames[note])}</span>)}
        {mode === 'free' && !sequence.length && <span>{t("Toque nos botões ou use o teclado.")}</span>}</div>
      {mode === 'demo' ? <div className="page-actions"><button className="action primary" onClick={() => {
        reset(); timers.current = song.notes.map((n,i) => setTimeout(() => { setCursor(i); play(n); }, i * 390));
        timers.current.push(setTimeout(() => setCursor(song.notes.length), song.notes.length * 390));
      }}>{t("Tocar partitura")}</button><button className="action" onClick={reset}>{t("Parar")}</button></div> :
        <div className="piano">{noteNames.map((label, i) => <button key={label} onClick={() => notePress(i as Note)}>{t(label)}<kbd>{noteKeys[i]}</kbd></button>)}</div>}
      {mode === 'guided' && <button className="action" onClick={reset}>{t("Recomeçar")}</button>}
      {mode === 'free' && <div className="page-actions"><input aria-label={t("Nome da melodia")} placeholder={t("Nome da melodia")} value={title} maxLength={60} onChange={e => setTitle(e.target.value)} />
        <button className="action primary" onClick={save}>{t("Guardar")}</button><button className="action" onClick={() => { setSequence([]); reset(); }}>{t("Limpar")}</button></div>}
      {!!message && <p className="notice" role="status">{t(message)}</p>}
    </section>
    <section className="focus-panel"><h2>{t("Compartilhar e importar")}</h2>
      <div className="page-actions"><button className="action" disabled={mode === 'free' && !sequence.length} onClick={async () => {
        const payload = melodyCode(mode === 'free' ? { title, notes: sequence } : song);
        setCode(payload); setQr(await makeQr(payload));
      }}>{t("Gerar QR da melodia")}</button>{qr && <button className="action" onClick={() => download(qr, 'ocarina-qr.png')}>{t("Baixar QR")}</button>}</div>
      {qr && <img className="qr-preview" src={qr} alt="QR code da melodia no formato Hyrule Tracker" />}
      <div className="page-actions"><input aria-label={t("Código da melodia")} placeholder={t("Cole o texto lido do QR")} value={code} maxLength={90} onChange={e => setCode(e.target.value)} />
        <button className="action" onClick={() => {
          const notes = parseMelody(code);
          if (!notes) return setMessage('Código inválido para o Hyrule Tracker.');
          setMode('free'); setSequence(notes); reset(); setMessage('Melodia carregada.');
        }}>{t("Importar")}</button></div>
      <h3>{t("Partituras de rumores")}</h3><p>{wallet}{t("pontos disponíveis")}</p>
      {bonusSongs.map(s => <div key={s.title} className="tool-row"><span>{t(s.title)}</span><button className="action" disabled={wallet < 1 || unlocked.includes(s.title)} onClick={() => {
        setWallet(wallet - 1); setUnlocked([...unlocked, s.title]);
      }}>{unlocked.includes(s.title) ? t('Desbloqueada') : t('Trocar por 1 ponto')}</button></div>)}
    </section>
  </div>;
}

export function PhotoStudio({ state }: { state: AppState }) {
  const [source, setSource] = useState(state.saveImage ?? '');
  const [frame, setFrame] = useState('gold');
  const [stamp, setStamp] = useState('triforce');
  const [caption, setCaption] = useState('');
  const [melody, setMelody] = useState('');
  const [message, setMessage] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    if (!source) return;
    let active = true;
    void (async () => {
      const im = await bitmap(source);
      const qr = parseMelody(melody) ? await bitmap(await makeQr(melody, 144)) : null;
      const c = canvas.current;
      if (!active || !c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const scale = Math.min(1, 1920 / im.width, 1400 / im.height);
      c.width = Math.round(im.width * scale); c.height = Math.round(im.height * scale);
      ctx.drawImage(im, 0, 0, c.width, c.height);
      const stroke = Math.max(5, Math.round(c.width * 0.012));
      if (frame !== 'none') {
        ctx.lineWidth = stroke; ctx.strokeStyle = frame === 'gold' ? '#e8bb64' : '#f3efe7';
        ctx.strokeRect(stroke, stroke, c.width - stroke * 2, c.height - stroke * 2);
      }
      if (stamp === 'triforce') {
        const x = c.width * 0.09, y = c.height * 0.17, size = c.width * 0.064;
        ctx.fillStyle = '#ffcb69';
        for (const [dx,dy] of [[0,-0.8],[-0.5,0],[0.5,0]]) {
          ctx.beginPath(); ctx.moveTo(x + dx * size, y + dy * size); ctx.lineTo(x + (dx - 0.48) * size, y + (dy + 0.78) * size); ctx.lineTo(x + (dx + 0.48) * size, y + (dy + 0.78) * size); ctx.fill();
        }
      }
      if (caption) {
        ctx.font = `bold ${Math.max(12, Math.round(c.width * 0.03))}px sans-serif`;
        ctx.fillStyle = '#140c06d9'; ctx.fillRect(stroke * 2, c.height * 0.83, c.width - stroke * 4, c.height * 0.12);
        ctx.fillStyle = '#fff2da'; ctx.textBaseline = 'middle';
        ctx.fillText(caption, stroke * 4, c.height * 0.89, c.width * (qr ? 0.67 : 0.84));
      }
      if (qr) {
        const size = Math.round(Math.min(c.width, c.height) * 0.27);
        ctx.drawImage(qr, c.width - size - stroke * 3, c.height - size - stroke * 3, size, size);
      }
      setReady(true);
    })().catch(() => { if (active) setMessage('Não foi possível abrir a imagem.'); });
    return () => { active = false; };
  }, [source, frame, stamp, caption, melody]);
  const image = source || state.saveImage;
  useEffect(() => { if (!source && image) setSource(image); }, [source, image]);
  return <div className="story-grid photo-grid">
    <section className="focus-panel"><h2>{t("Prévia")}</h2>{!source && <p className="quiet">{t("Capture a janela do jogo, carregue uma foto ou use a miniatura do save.")}</p>}<canvas ref={canvas} hidden={!source} aria-label={t("Foto editada")} /></section>
    <section className="focus-panel"><h2>{t("Editar foto")}</h2>
      <div className="page-actions"><label className="action file-action">{t("Carregar imagem")}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => {
        const file = e.target.files?.[0]; if (!file) return;
        if (file.size > 20_000_000) return setMessage('Escolha uma imagem de até 20 MB.');
        const r = new FileReader(); r.onload = () => { setSource(String(r.result)); setMessage(''); }; r.readAsDataURL(file);
      }} /></label><button className="action" disabled={!state.saveImage} onClick={() => { setSource(state.saveImage ?? ''); setMessage(''); }}>{t("Usar foto do save")}</button>
      <button className="action" disabled={!state.live.using} onClick={async () => {
        const png = await api.captureGame(); if (png) { setSource(png); setMessage(''); } else setMessage('Abra a janela do jogo para capturar.');
      }}>{t("Capturar jogo")}</button></div>
      {!!state.activity?.some(a => a.screenshot) && <label className="inline-field">{t("Do registro")}<select value="" onChange={e => {
        const shot = state.activity?.[Number(e.target.value)]?.screenshot; if (shot) setSource(shot);
      }}><option value="">{t("Escolha uma captura")}</option>{state.activity.map((a, i) => a.screenshot && <option key={i} value={i}>{date(a.ms)} · {a.area ?? 'Hyrule'}</option>)}</select></label>}
      <label className="inline-field">{t("Moldura")}<select value={frame} onChange={e => setFrame(e.target.value)}><option value="gold">{t("Dourada")}</option><option value="silver">{t("Clara")}</option><option value="none">{t("Sem moldura")}</option></select></label>
      <label className="inline-field">{t("Selo")}<select value={stamp} onChange={e => setStamp(e.target.value)}><option value="triforce">Triforce</option><option value="none">{t("Sem selo")}</option></select></label>
      <label className="inline-field">{t("Legenda")}<input value={caption} maxLength={80} onChange={e => setCaption(e.target.value)} /></label>
      <label className="inline-field">{t("Melodia (código QR)")}<input value={melody} maxLength={90} onChange={e => setMelody(e.target.value)} /></label>
      {melody && !parseMelody(melody) && <p className="quiet">{t("Cole um código gerado na ocarina do tracker.")}</p>}
      <button className="action primary" disabled={!ready} onClick={() => canvas.current && download(canvas.current.toDataURL('image/png'), 'hyrule-foto.png')}>{t("Exportar PNG")}</button>
      {message && <p role="status">{t(message)}</p>}
    </section>
  </div>;
}

const quests = [
  { id: 'forest', name: 'A aldeia atrás das árvores', clue: 'Procure o povoado de crianças protegido pela Grande Árvore.', area: 'KokiriForest', hint: 'Floresta Kokiri' },
  { id: 'farm', name: 'O lugar das corridas', clue: 'Visite o lugar onde Malon cuida dos cavalos.', area: 'LonLonRanch', hint: 'Rancho Lon Lon' },
  { id: 'lake', name: 'A água sob a ponte', clue: 'Procure o grande lago onde também se pode pescar.', area: 'LakeHylia', hint: 'Lago Hylia' },
  { id: 'village', name: 'O moinho da vila', clue: 'Siga para o vilarejo ao pé da Montanha da Morte.', area: 'KakarikoVillage', hint: 'Vila Kakariko' },
  { id: 'mountain', name: 'Na cidade de pedra', clue: 'O caminho pela montanha leva aos amigos de Darunia.', area: 'GoronCity', hint: 'Cidade Goron' },
  { id: 'desert', name: 'À sombra do colosso', clue: 'Procure o monumento além do deserto assombrado.', area: 'DesertColossus', hint: 'Colosso do Deserto' },
];
export function Gossip({ state }: { state: AppState }) {
  const [done, setDone] = useStored<string[]>('gossip.completed', []);
  const [points, setPoints] = useStored('gossip.points', 0);
  const [photos, setPhotos] = useStored<Record<string, string>>('gossip.photos', {});
  const [hint, setHint] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const area = (state.summary?.area ?? '').replace(/\(.*\)$/, '').replace(/[^a-z]/gi, '').toLowerCase();
  return <section className="focus-panel"><div className="section-line"><h2>{t("Caça fotográfica")}</h2><span>{done.length}/{quests.length} · {points}{t("pontos")}</span></div>
    <p className="quiet">{t("Encontre a região descrita, fotografe a janela do jogo e troque pontos por partituras.")}</p>
    <div className="gossip-grid">{quests.map(q => <article className="gossip-quest" key={q.id}>
      {(photos[q.id] || regionPhoto(q.area)) && <img src={photos[q.id] || regionPhoto(q.area)?.file} alt={t("")} loading="lazy" />}
      <h3><ObjectiveName done={done.includes(q.id)}>{t(q.name)}</ObjectiveName></h3><p>{t(q.clue)}</p>
      {hint === q.id && <p className="notice">{t(q.hint)}</p>}
      <div className="page-actions">{done.includes(q.id) ? <span className="quiet">{t("Concluída")}</span> : <>
        <button className="action" onClick={() => setHint(hint === q.id ? '' : q.id)}>{t("Dica")}</button>
        <button className="action primary" disabled={busy || !state.live.using} onClick={async () => {
          if (area !== q.area.toLowerCase()) return setMessage('A região atual não corresponde à pista.');
          setBusy(true);
          try {
            const shot = await api.captureGame();
            if (!shot) return setMessage('A janela do jogo precisa estar visível.');
            setPhotos({ ...photos, [q.id]: shot }); setDone([...done, q.id]); setPoints(points + 1); setMessage('Foto aceita. Você ganhou um ponto.');
          } finally { setBusy(false); }
        }}>{t("Fotografar")}</button>
      </>}</div>
    </article>)}</div>
    {message && <p className="notice" role="status">{t(message)}</p>}
  </section>;
}

type Question = [string, string, string, string, string, string?];
const normal: Question[] = [
  ['Quem acompanha Link desde Kokiri?', 'Navi', 'Malon', 'Sheik', 'Impa'],
  ['Quem ensina a canção de Epona?', 'Malon', 'Saria', 'Zelda', 'Ruto'],
  ['Qual arma pode voltar depois de arremessada?', 'Bumerangue', 'Estilingue', 'Martelo Megaton', 'Espada Kokiri'],
  ['Qual instrumento Link aprende a tocar?', 'Ocarina', 'Harpa', 'Flauta de Pã', 'Tambor'],
  ['Quantos pedaços formam um coração inteiro?', '4', '2', '3', '5'],
  ['Quantas Skulltulas douradas podem ser coletadas?', '100', '84', '50', '36'],
  ['Onde Zelda é encontrada pela primeira vez?', 'Castelo de Hyrule', 'Lago Hylia', 'Templo do Tempo', 'Vila Kakariko'],
  ['Qual é o nome do cavalo de Link?', 'Epona', 'Navi', 'Saria', 'Ingo'],
  ['Qual é a terra natal dos Kokiri?', 'Floresta Kokiri', 'Vale Gerudo', 'Campo de Hyrule', 'Cidade Goron'],
  ['Que raça vive no Domínio Zora?', 'Zora', 'Goron', 'Gerudo', 'Kokiri'],
  ['Quem é o antagonista principal?', 'Ganondorf', 'Darunia', 'Mido', 'Ingo'],
  ['Que item abre caminho explodindo pedras rachadas?', 'Bomba', 'Arco', 'Feijão mágico', 'Garrafa'],
  ['Onde fica o Rancho Lon Lon?', 'Campo de Hyrule', 'Domínio Zora', 'Castelo de Ganon', 'Bosque Perdido'],
  ['Qual é a moeda encontrada pelo caminho?', 'Rupee', 'Medalhão', 'Token', 'Pedra espiritual'],
  ['O que Link usa para refletir ataques?', 'Escudo', 'Bumerangue', 'Martelo', 'Botas de Ferro'],
];
const hard: Question[] = [
  ['Qual chefe espera no Templo da Floresta?', 'Phantom Ganon', 'Volvagia', 'Morpha', 'Twinrova'],
  ['Quem guarda a Pedra Espiritual da Água?', 'Ruto', 'Darunia', 'Nabooru', 'Saria'],
  ['Qual é a arma encontrada no Templo do Fogo?', 'Martelo Megaton', 'Arco das Fadas', 'Lente da Verdade', 'Bumerangue'],
  ['Em que templo aparece Dark Link?', 'Templo da Água', 'Templo dos Espíritos', 'Templo do Fogo', 'Templo das Sombras'],
  ['Qual a primeira masmorra de Link criança?', 'Grande Árvore Deku', 'Caverna dos Dodongos', 'Fundo do Poço', 'Barriga de Jabu-Jabu'],
  ['Quem se torna o Sábio do Fogo?', 'Darunia', 'Rauru', 'Mido', 'Talon'],
  ['Qual chefe é combatido no Templo das Sombras?', 'Bongo Bongo', 'Gohma', 'Twinrova', 'King Dodongo'],
  ['Qual canção transporta Link ao Lago Hylia?', 'Serenata da Água', 'Prelúdio da Luz', 'Bolero do Fogo', 'Minueto da Floresta'],
  ['Qual prova rende a Escala Dourada?', 'Pesca', 'Tiro ao alvo', 'Corrida de cavalos', 'Caça aos Poes'],
  ['Qual inimigo é derrotado na barriga de Jabu-Jabu?', 'Barinade', 'Morpha', 'Gohma', 'Volvagia'],
  ['Quantas Estátuas de Monstros existem no remake?', '84', '100', '36', '25'],
  ['Quantos Pedaços de Coração existem para coletar?', '36', '40', '17', '20'],
  ['Quem forja a espada de duas mãos na troca de adulto?', 'Biggoron', 'Darunia', 'Medigoron', 'Mido'],
  ['Qual é o nome do deserto entre a fortaleza e o Colosso?', 'Deserto Assombrado', 'Deserto Lanayru', 'Vale de Ikana', 'Areias de Nayru'],
  ['Quem é a Sábia dos Espíritos?', 'Nabooru', 'Impa', 'Ruto', 'Zelda'],
];
const testLength = 5;
function pictureQuestions(kind: 'enemy' | 'place'): Question[] {
  const images = quizImages(kind);
  const label = kind === 'enemy' ? 'Que inimigo está na imagem?' : 'Que local está na imagem?';
  return images.map((photo, i) => [
    label, photo.name, images[(i + 3) % images.length].name, images[(i + 7) % images.length].name,
    images[(i + 11) % images.length].name, photo.file,
  ]);
}
const normalBank = [...normal, ...pictureQuestions('place')];
const hardBank = [...hard, ...pictureQuestions('enemy')];
export function Quiz() {
  const [level, setLevel] = useState<'normal' | 'hard'>('normal');
  const [history, setHistory] = useStored<Record<string, number>>('quiz.results', {});
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string>();
  const [score, setScore] = useState(0);
  const [practice, setPractice] = useState(false);
  const key = `${day()}.${level}`;
  const bank = level === 'normal' ? normalBank : hardBank;
  const seed = Math.floor(Date.parse(day()) / 86400000);
  const question = bank[(seed + index * 2 + (practice ? 5 : 0)) % bank.length];
  const [label, answer, wrong1, wrong2, wrong3, photo] = question;
  const answers = [answer, wrong1, wrong2, wrong3];
  const rotate = (seed + index) % answers.length;
  function reset(next: boolean) { setPractice(next); setIndex(0); setChosen(undefined); setScore(0); }
  return <section className="focus-panel quiz-panel"><div className="section-line"><h2>{t("Conhecimentos de Hyrule")}</h2><span>{practice ? t('Treino') : t('Rodada diária')}</span></div>
    <div className="segment">{(['normal','hard'] as const).map(l => <button key={l} aria-pressed={level === l} onClick={() => { setLevel(l); reset(false); }}>{l === 'normal' ? 'Normal' : t('Difícil')}</button>)}</div>
    {index >= testLength || (!practice && history[key] != null) ? <>
      <p className="quiz-score">{!practice && history[key] != null ? history[key] : score}{t("de")}{' '}{testLength}{t("acertos")}</p>
      <button className="action primary" onClick={() => reset(true)}>{t("Jogar no modo treino")}</button>
    </> : <>
      <p className="quiet">{t("Questão")} {index + 1} {t("de")} {testLength}</p><h3>{t(label)}</h3>
      {photo && <img className="quiz-image" src={photo} alt={t('Imagem da pergunta')} />}
      <div className="quiz-answers">{[...answers.slice(rotate), ...answers.slice(0, rotate)].map(text =>
        <button className="action" key={text} aria-pressed={chosen === text} disabled={!!chosen} onClick={() => { setChosen(text); if (text === answer) setScore(score + 1); }}>{t(text)}</button>,
      )}</div>
      {chosen && <><p className="notice" role="status">{chosen === answer ? t('Resposta correta.') : `${t('Resposta correta')} · ${t(answer)}.`}</p><button className="action primary" onClick={() => {
        if (!practice && index + 1 === testLength) setHistory({ ...history, [key]: score });
        setIndex(index + 1); setChosen(undefined);
      }}>{index + 1 === testLength ? t('Ver resultado') : t('Próxima questão')}</button></>}
    </>}
  </section>;
}

type Figure = { name: string; count: number; last: string };
export function Amiibo({ state }: { state: AppState }) {
  const [figures, setFigures] = useStored<Figure[]>('amiibo.figures', []);
  const [name, setName] = useState('');
  const masks = state.categories.find(c => c.id === 'amiibo_masks');
  return <section className="focus-panel"><h2>{t("Registro de figuras")}</h2>
    <p className="quiet">{t("Registre os usos feitos no jogo. A cada cinco usos, o tracker destaca a meta de bônus.")}</p>
    <form className="page-actions" onSubmit={e => {
      e.preventDefault(); const n = name.trim();
      if (n && !figures.some(f => f.name.toLowerCase() === n.toLowerCase())) setFigures([...figures, { name: n, count: 0, last: '' }]);
      setName('');
    }}><input value={name} maxLength={60} onChange={e => setName(e.target.value)} placeholder={t("Nome da figura")} aria-label={t("Nome da figura")} /><button className="action primary" disabled={!name.trim()}>{t("Adicionar figura")}</button></form>
    {figures.map(f => <div className="tool-row" key={f.name}><span>{f.name}<small> {f.count}{t("usos ·")}{' '}{f.count > 0 && f.count % 5 === 0 ? t('meta de bônus atingida') : `${f.count % 5}/5 para a meta`}</small></span>
      <button className="action" disabled={f.last === day()} onClick={() => setFigures(figures.map(x => x.name === f.name ? { ...x, count: x.count + 1, last: day() } : x))}>{f.last === day() ? t('Registrado hoje') : t('Registrar uso')}</button></div>)}
    {masks && <><h3>{t("Máscaras encontradas no save")}</h3>{masks.items.map(i => <div className="tool-row" key={i.id}><span><GameItemIcon id={trackedItemIcon(i)} /> <ObjectiveName done={i.done}>{t(i.name)}</ObjectiveName></span><b>{i.done ? t('Coletada') : t('Pendente')}</b></div>)}</>}
  </section>;
}

