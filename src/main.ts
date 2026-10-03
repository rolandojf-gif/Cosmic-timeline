import { startApp } from './ui/app';
import './styles/main.css';

const root = document.querySelector<HTMLElement>('#app');
if (root) startApp(root);
