import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Overlay } from './Overlay';
import { currentLocale, loadLocale, setLocale } from './i18n';
import './styles.css';
import './responsive.css';

const isOverlay = new URLSearchParams(location.search).has('overlay');
const locale = currentLocale();
void loadLocale(locale).catch(console.error).then(() => {
  setLocale(locale);
  createRoot(document.getElementById('root')!).render(isOverlay ? <Overlay /> : <App />);
});
