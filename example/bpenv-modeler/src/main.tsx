import ReactDOM from 'react-dom/client';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { useGeographic } from 'ol/proj';
import { OSM } from 'ol/source.js';
import { Tile as TileLayer } from 'ol/layer.js';
import './style.css';

import { initializeManagers } from './components/initManagers';
import { addAttribute, removeAttribute, renameElement } from './utils/attributeManager';
import { undoLastAction } from './utils/historyManager';
import { updateUIState, updateSidebar, updateSidebar2 } from './ui/uiState';
import { exportModel } from './utils/exporter';
import { handleFileUpload, importModel } from './utils/importer';

// Layer base
const raster = new TileLayer({
  source: new OSM(),
  zIndex: 0,
});

useGeographic();

// Inizializza mappa
const map = new Map({
  layers: [raster],
  target: 'map',
  view: new View({
    center: [13.068307772123394, 43.139407493133405],
    zoom: 13,
  }),
});

// Inizializza manager e sidebar
initializeManagers(map);

// Espone funzioni globali per compatibilità
(window as any).addAttribute = addAttribute;
(window as any).removeAttribute = removeAttribute;
(window as any).renameElement = renameElement;
(window as any).undoLastAction = undoLastAction;
(window as any).updateUIState = updateUIState;
(window as any).exportModel = exportModel;
(window as any).importModel = importModel;
(window as any).handleFileUpload = handleFileUpload;

// Funzioni per evidenziare elementi sulla mappa
(window as any).highlightElement = (elementId: string) => {
  const selectionMgr = (window as any).selectionManager;
  if (selectionMgr) {
    selectionMgr.highlightElement(elementId);
  }
};

(window as any).unhighlightElement = () => {
  const selectionMgr = (window as any).selectionManager;
  if (selectionMgr) {
    selectionMgr.unhighlightElement();
  }
};

// Crea e monta la sidebar principale (sinistra)
const sidebarContainer = document.createElement('div');
sidebarContainer.id = 'sidebar-container';
document.body.appendChild(sidebarContainer);

const sidebarRoot = ReactDOM.createRoot(sidebarContainer);
(window as any).sidebarRoot = sidebarRoot;

// Crea e monta la seconda sidebar (destra)
const sidebar2Container = document.createElement('div');
sidebar2Container.id = 'sidebar2-container';
document.body.appendChild(sidebar2Container);

const sidebar2Root = ReactDOM.createRoot(sidebar2Container);
(window as any).sidebar2Root = sidebar2Root;

// Aggiorna entrambe le sidebar
updateSidebar();
updateSidebar2();

// Debug: click sulla mappa
map.on('click', function (evt) {
  console.log('Click coordinates:', evt.coordinate);
});

// Ogni volta che la mappa cambia, aggiorna lo stato
map.on('change', function () {
  updateUIState();
});

// Aggiornamento periodico dello stato
setInterval(updateUIState, 1000);

// Crea l'input file nascosto per l'upload
document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'model-upload';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', (e) => handleFileUpload(e));
  document.body.appendChild(fileInput);
  
  // Esponi la funzione per attivare l'input file
  (window as any).triggerFileInput = () => fileInput.click();
});
