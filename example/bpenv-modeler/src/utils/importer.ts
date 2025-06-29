// utils/importer.ts
import Feature from 'ol/Feature.js';
// import Geometry from 'ol/geom/Geometry.js';
import Polygon from 'ol/geom/Polygon.js';
import LineString from 'ol/geom/LineString.js';

interface ImportedModel {
  places: {
    id: string;
    name: string;
    coordinates: number[][];
    attributes: Record<string, string>;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    coordinates: number[][];
    attributes: Record<string, string>;
  }[];
  logicalPlaces: {
    id: string;
    name: string;
    description: string;
    conditions: any[];
    operator: 'AND' | 'OR';
    physicalPlaces: {
      id: string;
      attributes: Record<string, string>;
    }[];
  }[];
  views: {
    id: string;
    name: string;
    description: string;
    logicalPlaces: string[];
  }[];
}

function getCenter(coords: any[]) {
  const sum = coords.reduce((acc: any[], [x, y]: any) => [acc[0] + x, acc[1] + y], [0, 0]);
  return [sum[0] / coords.length, sum[1] / coords.length];
}

function computeEdgeCoordinates(edge: {
  id: string;
  source: string;
  target: string;
  coordinates: number[][];
  attributes: Record<string, string>;
}, places: any[]) {
  // const [_, sourceId, targetId] = edge.id.split('_'); // edge_place_source_target
  const source = places.find(p => p.id === edge.source);
  const target = places.find(p => p.id === edge.target);

  if (!source || !target) return null;

  const centerA = getCenter(source.coordinates);
  const centerB = getCenter(target.coordinates);

  return [centerA, centerB];
}

export function importModel(jsonString: string): boolean {
  try {
    const polygonManager = (window as any).polygonManager;
    const edgeManager = (window as any).edgeManager;

    if (!polygonManager || !edgeManager) {
      console.error('Manager non disponibili');
      return false;
    }

    // Pulisci le fonti esistenti
    polygonManager.getPlaceSource().clear();
    edgeManager.getEdgeSource().clear();

    // Analizza il JSON
    const model = JSON.parse(jsonString) as ImportedModel;

    // Importa le place fisiche
    model.places.forEach(place => {
      // Correggi il formato delle coordinate per OpenLayers
      // OpenLayers si aspetta un array di array di array [[[x,y], [x,y], ...]]
      const polygonCoordinates = [place.coordinates];

      const polygon = new Polygon(polygonCoordinates);
      const feature = new Feature({
        geometry: polygon
      });

      // Imposta gli attributi dopo la creazione della feature
      feature.set('type', 'place');
      feature.set('id', place.id);
      feature.set('name', place.name);
      feature.set('attributes', place.attributes || {});

      // Aggiungi la feature alla sorgente
      polygonManager.getPlaceSource().addFeature(feature);
    });

    // Importa gli edge
    model.edges.forEach(edge => {
      // const lineString = new LineString(edge.coordinates);
      const lineString = new LineString(computeEdgeCoordinates(edge, model.places) || []);
      const feature = new Feature({
        geometry: lineString
      });

      // Imposta gli attributi dopo la creazione della feature
      feature.set('type', 'edge');
      feature.set('id', edge.id);
      feature.set('source', edge.source);
      feature.set('target', edge.target);
      feature.set('attributes', edge.attributes || {});

      // Aggiungi la feature alla sorgente
      edgeManager.getEdgeSource().addFeature(feature);
    });

    // Salva le place logiche nel localStorage
    if (model.logicalPlaces && model.logicalPlaces.length > 0) {
      localStorage.setItem('logicalPlaces', JSON.stringify(model.logicalPlaces));
    }

    // Salva le views nel localStorage
    if (model.views && model.views.length > 0) {
      localStorage.setItem('views', JSON.stringify(model.views));
    }

    // Forza un aggiornamento della mappa
    setTimeout(() => {
      // Aggiorna le sidebar
      if (typeof (window as any).updateSidebarElements === 'function') {
        (window as any).updateSidebarElements();
      }
      if (typeof (window as any).updateSidebar2Elements === 'function') {
        (window as any).updateSidebar2Elements();
      }

      // Forza un aggiornamento della mappa
      if (typeof (window as any).updateUIState === 'function') {
        (window as any).updateUIState();
      }

      // Forza il rendering della mappa
      polygonManager.getPlaceLayer().changed();
      edgeManager.getEdgeLayer().changed();

      // Forza un aggiornamento della vista della mappa
      if (polygonManager.map) {
        polygonManager.map.updateSize();
        polygonManager.map.render();
      }
    }, 100);

    return true;
  } catch (error) {
    console.error('Errore durante l\'importazione del modello:', error);
    return false;
  }
}

// Funzione per gestire l'upload del file
export function handleFileUpload(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  if (file.type !== 'application/json') {
    alert('Per favore seleziona un file JSON valido.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    if (content) {
      const success = importModel(content);
      if (success) {
        alert('Modello importato con successo!');
      } else {
        alert('Si è verificato un errore durante l\'importazione del modello.');
      }
    }
  };
  reader.readAsText(file);
}

window.addEventListener('message', (event) => {
  if (event.data?.type === 'importModel') {
    const payload = event.data.payload;
    localStorage.setItem('envModel', payload);
    importModel(payload); // funzione da implementare nel contesto dell'iframe
  }
});