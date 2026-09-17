import { createRoot } from 'react-dom/client';
import App from '@/shadcn-demo/App';
import '../../css/shadcn-demo.css';

const root = document.getElementById('shadcn-root');

if (root) {
    createRoot(root).render(<App />);
}
