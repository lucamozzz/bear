// managers/initManagers.ts
import Map from 'ol/Map.js';
import PolygonManager from './PolygonManager';
import EdgeManager from './EdgeManager';
import SelectionManager from './SelectionManager';
import { updateSidebarElements } from '../ui/uiState';
import { addToHistory } from '../utils/historyManager';

let polygonManager: PolygonManager;
let edgeManager: EdgeManager;
let selectionManager: SelectionManager;

export function initializeManagers(map: Map) {
  polygonManager = new PolygonManager(map, updateSidebarElements, addToHistory);
  edgeManager = new EdgeManager(map, polygonManager.getPlaceSource(), updateSidebarElements, addToHistory);
  selectionManager = new SelectionManager(map, polygonManager, edgeManager, updateSidebarElements);

  // Se vuoi, esponili globalmente (opzionale)
  (window as any).polygonManager = polygonManager;
  (window as any).edgeManager = edgeManager;
  (window as any).selectionManager = selectionManager;
}

export { polygonManager, edgeManager, selectionManager };
