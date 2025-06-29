import { Select } from "ol/interaction";
import LineString from 'ol/geom/LineString.js';
import Polygon from 'ol/geom/Polygon.js';
import Feature from 'ol/Feature.js';
import Geometry from 'ol/geom/Geometry.js';
import { VectorSourceEvent } from 'ol/source/Vector';
import { click } from 'ol/events/condition.js';
import { Style, Stroke } from 'ol/style.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import Map from 'ol/Map.js';
import { Coordinate } from 'ol/coordinate';

// Definizione delle interfacce
// interface EdgeAttributes {
//   [key: string]: string;
// }

// Stile per gli archi
const edgeStyle = new Style({
  stroke: new Stroke({
    color: 'rgba(0, 0, 255, 0.8)', // Blu più opaco per maggiore visibilità
    width: 5, // Spessore maggiore
    lineCap: 'round', // Estremità arrotondate
    lineJoin: 'round' // Giunzioni arrotondate
  })
});

// Stile per gli archi selezionati
const selectedEdgeStyle = new Style({
  stroke: new Stroke({
    color: 'rgba(255, 165, 0, 0.8)', // Arancione per gli archi selezionati
    width: 6,
    lineCap: 'round',
    lineJoin: 'round'
  })
});

class EdgeManager {
  private map: Map;
  private edgeSource: VectorSource;
  private edgeLayer: VectorLayer<VectorSource>;
  private placeSource: VectorSource;
  private selectInteraction: Select | null = null;
  private selectedPlaces: Feature<Geometry>[] = [];
  private selectedEdge: Feature<Geometry> | null = null;
  private updateSidebarElements: () => void;
  private addToHistory: (type: string, feature: Feature<Geometry>) => void;

  constructor(map: Map, placeSource: VectorSource, updateSidebarElements: () => void, addToHistory: (type: string, feature: Feature<Geometry>) => void) {
    this.map = map;
    this.placeSource = placeSource;
    this.updateSidebarElements = updateSidebarElements;
    this.addToHistory = addToHistory;

    // Creazione delle sorgenti e dei layer
    this.edgeSource = new VectorSource();
    this.edgeLayer = new VectorLayer({
      source: this.edgeSource,
      style: edgeStyle,
      zIndex: 2 // Assicura che gli archi siano sopra i poligoni
    });

    // Aggiungi il layer alla mappa
    this.map.addLayer(this.edgeLayer);

    // Aggiungi listener per registrare le azioni
    this.edgeSource.on('addfeature', (event: VectorSourceEvent) => {
      if (event.feature) {
        this.addToHistory('add_edge', event.feature);
      }
    });
  }

  // Metodo per ottenere il layer degli archi
  getEdgeLayer(): VectorLayer<VectorSource> {
    return this.edgeLayer;
  }

  // Metodo per ottenere la sorgente degli archi
  getEdgeSource(): VectorSource {
    return this.edgeSource;
  }

  // Funzione per calcolare il centroide di un poligono
  calculateCentroid(polygon: Polygon): Coordinate {
    const coordinates = polygon.getCoordinates()[0];
    let x = 0;
    let y = 0;
    
    // Calcola la media delle coordinate
    for (let i = 0; i < coordinates.length; i++) {
      x += coordinates[i][0];
      y += coordinates[i][1];
    }
    
    return [x / coordinates.length, y / coordinates.length];
  }

  // Funzione per attivare la modalità di disegno degli archi
  activateDrawEdge(): void {
    // Rimuovi interazioni precedenti da tutti i manager
    (window as any).polygonManager.removeInteractions(); // Rimuove l'interazione di disegno dei poligoni
    this.removeInteractions(); // Rimuove le interazioni di EdgeManager
    
    // Crea nuova interazione per selezionare poligoni
    this.selectInteraction = new Select({
      condition: click,
      layers: [this.map.getLayers().getArray().find(layer => 
        layer instanceof VectorLayer && 
        layer.getZIndex() === 1
      ) as VectorLayer<VectorSource>],
      style: new Style({
        stroke: new Stroke({
          color: '#ffcc33',
          width: 3
        })
      })
    });
    
    // Aggiungi interazione alla mappa
    this.map.addInteraction(this.selectInteraction);
    
    // Resetta la selezione
    this.selectedPlaces = [];
    
    // Gestisci l'evento di selezione
    this.selectInteraction.on('select', (e) => {
      const selectedFeatures = e.selected;
      
      if (selectedFeatures.length > 0) {
        const feature = selectedFeatures[0];
        
        if (feature.get('type') === 'place') {
          if (this.selectedPlaces.length === 0) {
            // Primo poligono selezionato
            this.selectedPlaces.push(feature);
            console.log('Primo poligono selezionato:', feature.get('id'));
          } else if (this.selectedPlaces.length === 1 && this.selectedPlaces[0] !== feature) {
            // Secondo poligono selezionato, crea l'arco
            this.selectedPlaces.push(feature);
            console.log('Secondo poligono selezionato:', feature.get('id'));
            
            // Crea l'arco tra i due poligoni
            this.createEdge(this.selectedPlaces[0], this.selectedPlaces[1]);
            
            // Resetta la selezione
            this.selectedPlaces = [];
            this.selectInteraction?.getFeatures().clear();
          }
        }
      }
    });
  }

  // Funzione per attivare la modalità di selezione degli archi
  activateSelectEdge(): void {
    // Rimuovi interazioni precedenti
    this.removeInteractions();
    
    // Crea nuova interazione per selezionare archi
    this.selectInteraction = new Select({
      condition: click,
      layers: [this.edgeLayer],
      style: selectedEdgeStyle
    });
    
    // Aggiungi interazione alla mappa
    this.map.addInteraction(this.selectInteraction);
    
    // Gestisci l'evento di selezione
    this.selectInteraction.on('select', (e) => {
      const selectedFeatures = e.selected;
      
      if (selectedFeatures.length > 0) {
        this.selectedEdge = selectedFeatures[0];
        console.log('Arco selezionato:', this.selectedEdge.get('id'));
      } else {
        this.selectedEdge = null;
      }
    });
  }

  // Funzione per eliminare l'arco selezionato
  deleteSelectedEdge(): boolean {
    if (this.selectedEdge && this.selectedEdge.get('type') === 'edge') {
      const edgeId = this.selectedEdge.get('id');
      console.log('Eliminazione arco:', edgeId);
      
      // Salva una copia dell'arco per l'undo
      const featureCopy = this.selectedEdge.clone();
      
      // Rimuovi l'arco dalla sorgente
      this.edgeSource.removeFeature(this.selectedEdge);
      
      // Aggiungi alla cronologia delle azioni
      this.addToHistory('delete_edge', featureCopy);
      
      // Resetta la selezione
      if (this.selectInteraction) {
        this.selectInteraction.getFeatures().clear();
      }
      this.selectedEdge = null;
      
      // Aggiorna il pannello degli attributi
      this.updateSidebarElements();
      
      return true;
    } else {
      console.log('Nessun arco selezionato da eliminare');
      return false;
    }
  }

  // Funzione per creare un arco tra due poligoni
  createEdge(source: Feature<Geometry>, target: Feature<Geometry>): void {
    try {
      console.log('Creazione arco tra:', source.get('id'), 'e', target.get('id'));
      
      // Ottieni i centroidi dei poligoni
      const sourceGeom = source.getGeometry() as Polygon;
      const targetGeom = target.getGeometry() as Polygon;
      
      // Calcola i centroidi usando la funzione dedicata
      const sourceCoords = this.calculateCentroid(sourceGeom);
      const targetCoords = this.calculateCentroid(targetGeom);
      
      console.log('Coordinate arco - origine:', sourceCoords, 'destinazione:', targetCoords);
      
      // Crea un ID univoco basato sui poligoni di origine e destinazione
      const sourceId = source.get('id');
      const targetId = target.get('id');
      const edgeId = 'edge_' + sourceId + '_' + targetId;
      
      // Verifica se esiste già un arco con lo stesso ID o con origine/destinazione invertite
      const existingEdges = this.edgeSource.getFeatures();
      for (let i = 0; i < existingEdges.length; i++) {
        const edge = existingEdges[i];
        const edgeSourceId = edge.get('source');
        const edgeTargetId = edge.get('target');
        
        // Controlla sia l'ID esatto che la combinazione invertita di source/target
        if (edge.get('id') === edgeId || 
            (edgeSourceId === sourceId && edgeTargetId === targetId)) {
          console.log('Arco già esistente tra questi poligoni');
          return; // Esci dalla funzione se l'arco esiste già
        }
      }
      
      // Crea una feature LineString
      const lineString = new LineString([sourceCoords, targetCoords]);
      console.log('LineString creata:', lineString.getCoordinates());
      
      const edgeFeature = new Feature({
        geometry: lineString,
        type: 'edge',
        id: edgeId,
        name: edgeId,
        source: sourceId,
        target: targetId,
        attributes: {}
      });
      
      // Imposta esplicitamente lo stile per questa feature
      edgeFeature.setStyle(edgeStyle);
      
      // Aggiungi la feature al layer degli archi
      this.edgeSource.addFeature(edgeFeature);
      console.log('Arco creato tra:', sourceId, 'e', targetId);
      console.log('Numero di archi nel layer:', this.edgeSource.getFeatures().length);
      
      // Forza il refresh del layer
      this.edgeLayer.changed();
      
      // Verifica che l'arco sia stato aggiunto
      console.log('Archi nel layer dopo aggiunta:', this.edgeSource.getFeatures().length);
      console.log('Arco aggiunto:', edgeFeature.getGeometry()?.getCoordinates() || 'Geometria non disponibile');

      // Aggiorna il pannello degli attributi
      this.updateSidebarElements();
    } catch (error) {
      console.error('Errore nella creazione dell\'arco:', error);
    }
  }

  // Funzione per rimuovere le interazioni correnti
  removeInteractions(): void {
    if (this.selectInteraction) {
      this.map.removeInteraction(this.selectInteraction);
      this.selectInteraction = null;
    }
    
  }

  // Funzione per impostare l'arco selezionato (usata dal SelectionManager)
  setSelectedEdge(edge: Feature<Geometry> | null): void {
    this.selectedEdge = edge;
  }

  // Funzione per ottenere l'arco selezionato
  getSelectedEdge(): Feature<Geometry> | null {
    return this.selectedEdge;
  }

  // Funzione per verificare se ci sono archi disegnati
  hasEdges(): boolean {
    return this.edgeSource.getFeatures().length > 0;
  }

  // Funzione per contare il numero di archi
  getEdgeCount(): number {
    return this.edgeSource.getFeatures().length;
  }

  // Funzione per verificare se ci sono abbastanza poligoni per creare un arco
  canCreateEdge(): boolean {
    return this.placeSource.getFeatures().length >= 1;
  }
}

export default EdgeManager;
