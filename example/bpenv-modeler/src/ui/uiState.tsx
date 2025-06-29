// ui/uiState.ts
import React from 'react';
import Sidebar from './Sidebar';
import Sidebar2 from './Sidebar2';
import { undoLastAction } from '../utils/historyManager';
import { exportModel } from '../utils/exporter';
import { renameElement } from '../utils/attributeManager';

// Stato dell'interfaccia (esportabile e modificabile)
export let uiState = {
  canDrawEdge: false,
  hasSelectedElement: false,
};

// Aggiorna lo stato dell'interfaccia
export function updateUIState(): void {
  const polygonManager = (window as any).polygonManager;
  const edgeManager = (window as any).edgeManager;
  const selectionManager = (window as any).selectionManager;

  if (!polygonManager || !edgeManager || !selectionManager) return;

  uiState = {
    canDrawEdge: polygonManager.getPolygonCount() >= 2,
    hasSelectedElement: selectionManager.hasSelectedElement(),
  };

  updateSidebar();
  updateSidebar2();
}

// Renderizza la sidebar principale (sinistra)
export function updateSidebar(): void {
  const sidebarRoot = (window as any).sidebarRoot;
  const polygonManager = (window as any).polygonManager;
  const edgeManager = (window as any).edgeManager;
  const selectionManager = (window as any).selectionManager;

  if (!sidebarRoot || !polygonManager || !edgeManager || !selectionManager) return;

  sidebarRoot.render(
    <React.StrictMode>
      <Sidebar
        onDrawPolygon={() => polygonManager.activateDrawPolygon()}
        onDrawEdge={() => edgeManager.activateDrawEdge()}
        onSelect={() => selectionManager.activateSelection()}
        onDelete={() => selectionManager.deleteSelectedElement()}
        onUndo={undoLastAction}
        onExportModel={exportModel}
        canDrawEdge={uiState.canDrawEdge}
        hasSelectedElement={uiState.hasSelectedElement}
        onRenameElement={renameElement}
      />
    </React.StrictMode>
  );
}

// Renderizza la seconda sidebar (destra)
export function updateSidebar2(): void {
  const sidebar2Root = (window as any).sidebar2Root;
  
  if (!sidebar2Root) return;

  sidebar2Root.render(
    <React.StrictMode>
      <Sidebar2 />
    </React.StrictMode>
  );
}

// Aggiorna gli elementi visualizzati nelle sidebar
export function updateSidebarElements(): void {
  const polygonManager = (window as any).polygonManager;
  const edgeManager = (window as any).edgeManager;
  const selectionManager = (window as any).selectionManager;

  if (!polygonManager || !edgeManager || !selectionManager) return;

  const placeFeatures = polygonManager.getPlaceSource().getFeatures();
  const edgeFeatures = edgeManager.getEdgeSource().getFeatures();

  const elements = [
    ...placeFeatures.map((feature: any) => ({
      id: feature.get('id'),
      name: feature.get('name'),
      type: 'place',
      attributes: feature.get('attributes') || {},
    })),
    ...edgeFeatures.map((feature: any) => ({
      id: feature.get('id'),
      type: 'edge',
      source: feature.get('source'),
      target: feature.get('target'),
      attributes: feature.get('attributes') || {},
    })),
  ];

  // Ottieni l'elemento selezionato corrente
  const selectedFeature = selectionManager.getSelectedElement();
  let selectedElement = null;
  
  if (selectedFeature) {
    const selectedId = selectedFeature.get('id');
    selectedElement = elements.find(el => el.id === selectedId);
  }

  // Aggiorna entrambe le sidebar con gli elementi e l'elemento selezionato
  if (typeof (window as any).updateSidebarElements === 'function') {
    (window as any).updateSidebarElements(elements, selectedElement);
  }
  
  if (typeof (window as any).updateSidebar2Elements === 'function') {
    (window as any).updateSidebar2Elements(elements);
  }

  // Salva gli elementi globalmente per riferimento futuro
  (window as any).elements = elements;

  updateUIState();
}
