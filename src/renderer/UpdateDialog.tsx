import { useEffect, useState } from 'react';
import type { UpdateState } from '../shared/types';
import { api } from './api';
import { percent, t } from './i18n';
import { useModalDialog } from './useModalDialog';

const sectionKind = (title = '') => /^new/i.test(title) ? 'new' : /^improv/i.test(title) ? 'improved' : /^fix/i.test(title) ? 'fixed' : /^known/i.test(title) ? 'known' : '';

export function UpdateDialog() {
  const [u, setU] = useState<UpdateState>({ status: 'idle' });
  const dialog = useModalDialog(u.status !== 'idle');
  useEffect(() => {
    void api.getUpdate().then(setU).catch(console.error);
    return api.onUpdate(setU);
  }, []);
  if (u.status === 'idle') return null;
  const dismissible = u.status === 'available' || u.status === 'error';

  return (
    <dialog className="update-card" ref={dialog} aria-labelledby="update-title" onCancel={e => {
      e.preventDefault();
      if (dismissible) api.updateLater();
    }}>
        <div className="update-head">
          <span className="update-badge" aria-hidden>⬆</span>
          <div>
            <h2 id="update-title">{u.status === 'ready' ? t('Atualização pronta') : t('Nova versão disponível')}</h2>
            {u.version && <p className="update-version">v{u.version}</p>}
          </div>
        </div>

        {u.status === 'available' && !!u.notes?.length && (
          <div className="update-notes">
            <h3>{t('Novidades')}</h3>
            <div className="update-notes-body" tabIndex={0}>
              {u.notes.map((section, i) => (
                <section key={i} className={`update-section ${sectionKind(section.title)}`}>
                  {section.title && <h4>{t(section.title)}</h4>}
                  <ul>{section.items.map((item, j) => (
                    <li key={j}>{item.title && <b>{item.title}</b>}{item.text && <span>{item.text}</span>}</li>
                  ))}</ul>
                </section>
              ))}
            </div>
          </div>
        )}
        {u.status === 'downloading' && (
          <div className="update-progress">
            <p>{t('Baixando a atualização…')} {percent((u.percent ?? 0) / 100)}</p>
            <div className="update-bar" role="progressbar" aria-label={t('Baixando a atualização…')} aria-valuenow={u.percent ?? 0}><div style={{ transform: `scaleX(${(u.percent ?? 0) / 100})` }} /></div>
          </div>
        )}
        {u.status === 'ready' && <p role="status">{t('A atualização foi baixada. Reinicie para instalar.')}</p>}
        {u.status === 'error' && <p className="update-error" role="alert">{t('Não foi possível baixar a atualização.')}</p>}

        <div className="update-actions">
          {dismissible && (
            <>
              <button onClick={() => api.updateLater()}>{t('Depois')}</button>
              <button className="primary" onClick={() => api.updateNow()}>{u.status === 'error' ? t('Tentar novamente') : t('Atualizar')}</button>
            </>
          )}
          {u.status === 'ready' && <button className="primary" onClick={() => api.installUpdate()}>{t('Reiniciar e instalar')}</button>}
        </div>
    </dialog>
  );
}
