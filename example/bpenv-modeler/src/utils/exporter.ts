// utils/exporter.ts
import Feature from 'ol/Feature.js';
import Geometry from 'ol/geom/Geometry.js';
import Polygon from 'ol/geom/Polygon.js';
import LineString from 'ol/geom/LineString.js';

interface LogicalPlace {
  id: string;
  name: string;
  description?: string;
  conditions: any[];
  operator: 'AND' | 'OR';
  physicalPlaces: any[]; // Place fisiche che soddisfano le condizioni
}

interface View {
  id: string;
  name: string;
  description?: string;
  logicalPlaces: string[]; // ID delle place logiche contenute nella view
  attributes?: any; // Attributi aggiuntivi della view
}

export function exportModel(): string {
  const polygonManager = (window as any).polygonManager;
  const edgeManager = (window as any).edgeManager;

  if (!polygonManager || !edgeManager) return '{}';

  const placeFeatures = polygonManager.getPlaceSource().getFeatures();
  const edgeFeatures = edgeManager.getEdgeSource().getFeatures();

  // Recupera le place logiche dal localStorage
  let logicalPlaces: LogicalPlace[] = [];
  try {
    const savedLogicalPlaces = localStorage.getItem('logicalPlaces');
    if (savedLogicalPlaces) {
      logicalPlaces = JSON.parse(savedLogicalPlaces);
    }
  } catch (error) {
    console.error('Error loading logical places from localStorage:', error);
  }

  // Recupera le views dal localStorage (se esistono)
  let views: View[] = [];
  try {
    const savedViews = localStorage.getItem('views');
    if (savedViews) {
      views = JSON.parse(savedViews);
    }
  } catch (error) {
    console.error('Error loading views from localStorage:', error);
  }

  const model = {
    places: [] as any[],
    edges: [] as any[],
    logicalPlaces: [] as any[],
    views: [] as any[]
  };

  // Aggiungi le place fisiche al modello
  placeFeatures.forEach((feature: Feature<Geometry>) => {
    const geometry = feature.getGeometry();
    if (geometry instanceof Polygon) {
      const coordinates = geometry.getCoordinates()[0];
      model.places.push({
        id: feature.get('id'),
        name: feature.get('name'),
        coordinates,
        attributes: feature.get('attributes') || {}
      });
    }
  });

  // Aggiungi gli edge al modello
  edgeFeatures.forEach((feature: Feature<Geometry>) => {
    const geometry = feature.getGeometry();
    if (geometry instanceof LineString) {
      const coordinates = geometry.getCoordinates();
      model.edges.push({
        id: feature.get('id'),
        name: feature.get('name'),
        source: feature.get('source'),
        target: feature.get('target'),
        coordinates,
        attributes: feature.get('attributes') || {}
      });
    }
  });

  // Aggiungi le place logiche al modello
  logicalPlaces.forEach((logicalPlace: LogicalPlace) => {
    model.logicalPlaces.push({
      id: logicalPlace.id,
      name: logicalPlace.name,
      description: logicalPlace.description || '',
      conditions: logicalPlace.conditions,
      operator: logicalPlace.operator,
      // physicalPlaces: logicalPlace.physicalPlaces.map(place => ({
      //   id: place.id,
      //   attributes: place.attributes || {}
      // }))
    });
  });


  const viewAggregations = localStorage.getItem('viewAggregations');
  const aggregations: any = viewAggregations ? JSON.parse(viewAggregations) : {};
  if (viewAggregations) {
    views.forEach((view: View) => {
      if (aggregations[view.id]) {
        view.attributes = aggregations[view.id];
      }
    });
  }

  // Aggiungi le views al modello
  views.forEach((view: View) => {
    model.views.push({
      id: view.id,
      name: view.name,
      description: view.description || '',
      logicalPlaces: view.logicalPlaces,
      attributes: view.attributes || {}
    });
  });

  return JSON.stringify(model, null, 2);
}

(window as any).exportModel = exportModel;

window.addEventListener('message', (event) => {
  if (event.data === 'callExportModel') {
    // Reply with the result
    event.source?.postMessage({
      type: 'exportModelResult',
      payload: exportModel()
    }, event.origin as WindowPostMessageOptions); // or '*' if you're only running locally
  }
});