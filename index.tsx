import React from 'react';
import { createRoot } from 'react-dom/client';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import App from './App';

// --- STYLESHEET IMPORTS ---
// Master stylesheet is imported first.
import './style-master.css';

// Component and view-specific stylesheets are imported next, alphabetized for consistency.
import './style-cards-containers.css';
import './style-chronos-control.css';
import './style-forms-buttons.css';
import './style-global.css';
import './style-kpi-card.css';
import './style-layout.css';
import './style-modals.css';
import './style-order-management.css';
import './style-order-panel.css';
import './style-pos-category-column.css';
import './style-pos-menu-grid.css';
import './style-pos-mobile.css';
import './style-pos-overlays.css';
import './style-pos-view-layout.css';
import './style-receipt-editor-v2.css';
import './style-receipt.css';
import './style-reports.css';
import './style-sentinel-log-report.css';
import './style-settings-components.css';
import './style-settings-layout.css';
import './style-shift-management.css';
import './style-ultra-ai-dashboard.css';
import './style-views.css';


// --- CHART.JS REGISTRATION ---
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}