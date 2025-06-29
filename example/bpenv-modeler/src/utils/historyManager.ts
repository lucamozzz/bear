
import Feature from 'ol/Feature.js';
import Geometry from 'ol/geom/Geometry.js';
import { updateSidebarElements } from '../ui/uiState';

interface Action {
  type: 'add_place' | 'add_edge' | 'delete_place' | 'delete_edge';
  feature: Feature<Geometry>;
}

const actionHistory: Action[] = [];

export function addToHistory(type: string, feature: Feature<Geometry>): void {
  actionHistory.push({
    type: type as Action['type'],
    feature,
  });
  console.log('Azione aggiunta:', type, feature.get('id'));
  console.log('Dimensione cronologia:', actionHistory.length);
  updateSidebarElements();
}

export function undoLastAction(): void {
  if (actionHistory.length === 0) {
    console.log('Nessuna azione da annullare');
    return;
  }

  const lastAction = actionHistory.pop();
  if (!lastAction) return;

  const polygonManager = (window as any).polygonManager;
  const edgeManager = (window as any).edgeManager;

  if (!polygonManager || !edgeManager) return;

  console.log('Annullamento azione:', lastAction.type);

  switch (lastAction.type) {
    case 'add_place':
      polygonManager.getPlaceSource().removeFeature(lastAction.feature);
      break;
    case 'add_edge':
      edgeManager.getEdgeSource().removeFeature(lastAction.feature);
      break;
    case 'delete_place':
      polygonManager.getPlaceSource().addFeature(lastAction.feature);
      break;
    case 'delete_edge':
      edgeManager.getEdgeSource().addFeature(lastAction.feature);
      break;
  }

  updateSidebarElements();
}
