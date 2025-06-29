import React, { useState, useEffect } from 'react';
import "./Sidebar2.css";

interface Sidebar2Props {
  // Non sono necessarie props specifiche poiché la sidebar si aggiorna automaticamente
}

interface PlaceAttributes {
  [key: string]: string;
}

interface EdgeAttributes {
  [key: string]: string;
}

interface Place {
  id: string;
  type: 'place';
  attributes: PlaceAttributes;
}

interface Edge {
  id: string;
  type: 'edge';
  source: string;
  target: string;
  attributes: EdgeAttributes;
}

interface Condition {
  attribute: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: string;
}

interface LogicalPlace {
  id: string;
  name: string;
  description?: string;
  conditions: Condition[];
  operator: 'AND' | 'OR';
  physicalPlaces: Place[]; // Place fisiche che soddisfano le condizioni
}

interface View {
  id: string;
  name: string;
  description?: string;
  logicalPlaces: string[]; // ID delle place logiche contenute nella view
}

type Element = Place | Edge;

// Componente per la sidebar a destra
const Sidebar2: React.FC<Sidebar2Props> = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hoveredElements, setHoveredElements] = useState<string[]>([]); // Modificato per supportare più elementi
  const [refreshKey, setRefreshKey] = useState<number>(0); // Stato per forzare il refresh
  const [isVisible, setIsVisible] = useState(false);

  // Stati per le place logiche
  const [logicalPlaces, setLogicalPlaces] = useState<LogicalPlace[]>([]);
  const [showLogicalPlaceEditor, setShowLogicalPlaceEditor] = useState(false);

  // Stati per la selezione manuale di place fisiche
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>([]);
  const [newManualLogicalPlaceName, setNewManualLogicalPlaceName] = useState<string>('');

  // Stato per le views
  const [views, setViews] = useState<View[]>([]);
  const [showViewEditor, setShowViewEditor] = useState(false);
  const [newViewName, setNewViewName] = useState<string>('');
  const [selectedLogicalPlaces, setSelectedLogicalPlaces] = useState<string[]>([]);

  // Stato per espandere/comprimere i dettagli delle place fisiche
  const [expandedLogicalPlaces, setExpandedLogicalPlaces] = useState<string[]>([]);

  // Stato per le aggregazioni delle view
  // Modificato: ora memorizza solo l'aggregazione per attributo a livello di view
  // Esempio: { 'view-123': { 'attributeName': 'SUM' } }
  const [viewAggregations, setViewAggregations] = useState<Record<string, Record<string, 'MAX' | 'MIN' | 'AVG' | 'SUM' | 'COUNT' | null>>>({});

  // Salva le place logiche nel localStorage
  const saveLogicalPlacesToLocalStorage = () => {
    localStorage.setItem('logicalPlaces', JSON.stringify(logicalPlaces));
  };

  // Salva le aggregazioni delle view nel localStorage
  const saveViewAggregationsToLocalStorage = () => {
    localStorage.setItem('viewAggregations', JSON.stringify(viewAggregations));
  };

  // Carica le place logiche dal localStorage
  const loadLogicalPlacesFromLocalStorage = () => {
    const savedLogicalPlaces = localStorage.getItem('logicalPlaces');
    if (savedLogicalPlaces) {
      try {
        const parsedLogicalPlaces = JSON.parse(savedLogicalPlaces) as LogicalPlace[];
        setLogicalPlaces(parsedLogicalPlaces);
      } catch (error) {
        console.error('Error loading logical places from localStorage:', error);
      }
    }
  };

  // Carica le aggregazioni delle view dal localStorage
  const loadViewAggregationsFromLocalStorage = () => {
    const savedViewAggregations = localStorage.getItem('viewAggregations');
    if (savedViewAggregations) {
      try {
        const parsedViewAggregations = JSON.parse(savedViewAggregations);
        setViewAggregations(parsedViewAggregations);
      } catch (error) {
        console.error('Error loading view aggregations from localStorage:', error);
      }
    }
  };

  // Salva le views nel localStorage
  const saveViewsToLocalStorage = () => {
    localStorage.setItem('views', JSON.stringify(views));
  };

  // Salva tutto nel localStorage
  const saveAllToLocalStorage = () => {
    saveLogicalPlacesToLocalStorage();
    saveViewsToLocalStorage();
    saveViewAggregationsToLocalStorage();
  };

  // Carica le views dal localStorage
  const loadViewsFromLocalStorage = () => {
    const savedViews = localStorage.getItem('views');
    if (savedViews) {
      try {
        const parsedViews = JSON.parse(savedViews) as View[];
        setViews(parsedViews);
      } catch (error) {
        console.error('Error loading views from localStorage:', error);
      }
    }
  };

  // Carica tutto dal localStorage
  const loadAllFromLocalStorage = () => {
    loadLogicalPlacesFromLocalStorage();
    loadViewsFromLocalStorage();
    loadViewAggregationsFromLocalStorage();
  };

  // Funzione per aggiornare gli elementi dalla mappa
  const updateElements = (newElements: Element[]) => {
    // console.log("Sidebar2: Update elements", newElements);

    // Filtra gli elementi per tipo
    if (newElements) {
      const newPlaces = newElements.filter(el => el.type === 'place') as Place[];
      const newEdges = newElements.filter(el => el.type === 'edge') as Edge[];


      // Aggiorna gli stati
      setPlaces(newPlaces);
      setEdges(newEdges);

      // Aggiorna le place logiche con le nuove place fisiche
      updateLogicalPlaces(newPlaces);

      // Forza un refresh del componente
      setRefreshKey(prev => prev + 1);
    }
  };

  // Funzione per aggiornare le place logiche con le nuove place fisiche
  const updateLogicalPlaces = (newPlaces: Place[]) => {
    const updatedLogicalPlaces = logicalPlaces.map(logicalPlace => {
      // Se la place logica è stata creata manualmente (senza condizioni),
      // mantieni le sue place fisiche originali ma aggiorna i riferimenti
      if (logicalPlace.conditions.length === 0) {
        return {
          ...logicalPlace,
          physicalPlaces: logicalPlace.physicalPlaces.map(oldPlace => {
            // Cerca la place aggiornata corrispondente
            const updatedPlace = newPlaces.find(p => p.id === oldPlace.id);
            return updatedPlace || oldPlace;
          }).filter(place => newPlaces.some(p => p.id === place.id)) // Rimuovi le place che non esistono più
        };
      }

      // Per le place logiche basate su condizioni, ricalcola le place fisiche
      const matchingPlaces = newPlaces.filter(place =>
        evaluateLogicalPlace(place, logicalPlace)
      );

      return {
        ...logicalPlace,
        physicalPlaces: matchingPlaces
      };
    });

    // Importante: confronta se ci sono cambiamenti prima di aggiornare lo stato
    // per evitare cicli di rendering infiniti
    if (JSON.stringify(updatedLogicalPlaces) !== JSON.stringify(logicalPlaces)) {
      setLogicalPlaces(updatedLogicalPlaces);
    }
  };

  // Funzione per valutare una condizione su una place
  const evaluateCondition = (place: Place, condition: Condition): boolean => {
    const attributeValue = place.attributes[condition.attribute];
    if (attributeValue === undefined) return false;

    // Converti i valori in numeri se possibile per confronti numerici
    const placeValue = !isNaN(Number(attributeValue)) ? Number(attributeValue) : attributeValue;
    const conditionValue = !isNaN(Number(condition.value)) ? Number(condition.value) : condition.value;

    switch (condition.operator) {
      case '==': return placeValue === conditionValue;
      case '!=': return placeValue !== conditionValue;
      case '>': return placeValue > conditionValue;
      case '<': return placeValue < conditionValue;
      case '>=': return placeValue >= conditionValue;
      case '<=': return placeValue <= conditionValue;
      default: return false;
    }
  };

  // Funzione per valutare se una place soddisfa tutte le condizioni di una place logica
  const evaluateLogicalPlace = (place: Place, logicalPlace: LogicalPlace): boolean => {
    if (logicalPlace.conditions.length === 0) return false; // Should not happen for condition-based logical places

    if (logicalPlace.operator === 'AND') {
      return logicalPlace.conditions.every(condition =>
        evaluateCondition(place, condition)
      );
    } else { // OR
      return logicalPlace.conditions.some(condition =>
        evaluateCondition(place, condition)
      );
    }
  };

  // Funzione per ottenere gli elementi direttamente
  const fetchElements = () => {
    try {
      const polygonManager = (window as any).polygonManager;
      const edgeManager = (window as any).edgeManager;

      if (!polygonManager || !edgeManager) {
        console.log("Sidebar2: Managers not available");
        return;
      }

      const placeFeatures = polygonManager.getPlaceSource().getFeatures();
      const edgeFeatures = edgeManager.getEdgeSource().getFeatures();

      // console.log("Sidebar2: Features obtained", {
      //   places: placeFeatures.length,
      //   edges: edgeFeatures.length
      // });

      const elements = [
        ...placeFeatures.map((feature: any) => ({
          id: feature.get('id'),
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

      updateElements(elements);
    } catch (error) {
      console.error("Sidebar2: Error in retrieving items", error);
    }
  };

  // Esponi la funzione updateElements globalmente e imposta un timer per l'aggiornamento
  useEffect(() => {
    // console.log("Sidebar2: Initialization");
    (window as any).updateSidebar2Elements = updateElements;

    // Esponi la funzione per aggiungere una place logica dalla sidebar sinistra
    (window as any).addLogicalPlace = (logicalPlace: LogicalPlace) => {
      console.log("Sidebar2: Ricevuta nuova place logica", logicalPlace);

      // Verifica se esiste già una place logica con lo stesso ID
      const existingIndex = logicalPlaces.findIndex(place => place.id === logicalPlace.id);

      if (existingIndex >= 0) {
        // Aggiorna la place logica esistente
        const updatedLogicalPlaces = [...logicalPlaces];
        updatedLogicalPlaces[existingIndex] = {
          ...logicalPlace,
          // Mantieni la descrizione esistente se presente
          description: logicalPlaces[existingIndex].description || logicalPlace.description
        };
        setLogicalPlaces(updatedLogicalPlaces);
      } else {
        // Aggiungi la nuova place logica
        setLogicalPlaces(prev => [...prev, logicalPlace]); // Use functional update
      }
    };

    // Esponi la funzione per evidenziare più elementi contemporaneamente
    (window as any).highlightMultipleElements = (elementIds: string[]) => {
      // Utilizziamo direttamente il PolygonManager se disponibile
      if (typeof (window as any).polygonManager !== 'undefined' &&
        typeof (window as any).polygonManager.highlightMultipleFeatures === 'function') {
        (window as any).polygonManager.highlightMultipleFeatures(elementIds);
      } else {
        // Fallback nel caso in cui il PolygonManager non sia disponibile
        console.log("PolygonManager not available, using fallback highlighting");

        // Prima rimuoviamo tutte le evidenziazioni
        if (typeof (window as any).unhighlightElement === 'function') {
          (window as any).unhighlightElement();
        }

        // Poi evidenziamo ogni elemento
        elementIds.forEach(id => {
          if (typeof (window as any).highlightElement === 'function') {
            (window as any).highlightElement(id);
          }
        });
      }
    };

    // Esponi la funzione per evidenziare un singolo elemento
    (window as any).highlightElement = (elementId: string) => {
      if (typeof (window as any).polygonManager !== 'undefined' &&
        typeof (window as any).polygonManager.highlightFeature === 'function') {
        (window as any).polygonManager.highlightFeature(elementId);
      }
    };

    // Esponi la funzione per rimuovere le evidenziazioni
    (window as any).unhighlightElement = () => {
      if (typeof (window as any).polygonManager !== 'undefined' &&
        typeof (window as any).polygonManager.unhighlightFeatures === 'function') {
        (window as any).polygonManager.unhighlightFeatures();
      }
    };

    // Carica le place logiche e le views salvate
    loadAllFromLocalStorage();

    // Inizializza con gli elementi esistenti se disponibili
    if ((window as any).elements) {
      console.log("Sidebar2: Existing elements found", (window as any).elements);
      updateElements((window as any).elements);
    }

    // Recupera gli elementi direttamente
    fetchElements();

    // Imposta un timer per aggiornare periodicamente gli elementi
    const timer = setInterval(() => {
      // console.log("Sidebar2: Periodic update");
      fetchElements();
    }, 1000); // Update every second - might be too frequent? Consider increasing interval.

    return () => {
      // Rimuovi le funzioni globali e il timer quando il componente viene smontato
      delete (window as any).updateSidebar2Elements;
      delete (window as any).addLogicalPlace;
      delete (window as any).highlightMultipleElements;
      delete (window as any).highlightElement;
      delete (window as any).unhighlightElement;
      clearInterval(timer);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Salva le place logiche quando cambiano
  useEffect(() => {
    saveLogicalPlacesToLocalStorage();
  }, [logicalPlaces]);

  // Salva le views quando cambiano
  useEffect(() => {
    saveViewsToLocalStorage();
  }, [views]);

  // Salva le aggregazioni quando cambiano
  useEffect(() => {
    saveViewAggregationsToLocalStorage();
  }, [viewAggregations]);

  // Funzione per evidenziare un elemento sulla mappa
  const highlightElement = (elementId: string) => {
    setHoveredElements([elementId]);

    if (typeof (window as any).highlightElement === 'function') {
      (window as any).highlightElement(elementId);
    }
  };

  // Funzione per evidenziare più elementi sulla mappa (per place logiche)
  const highlightMultipleElements = (elementIds: string[]) => {
    if (elementIds.length === 0) return;

    // Imposta tutti gli elementi come hoveredElements
    setHoveredElements(elementIds);

    // Utilizziamo il PolygonManager direttamente se disponibile
    if (typeof (window as any).polygonManager !== 'undefined' &&
      typeof (window as any).polygonManager.highlightMultipleFeatures === 'function') {
      // Chiamata diretta al PolygonManager
      (window as any).polygonManager.highlightMultipleFeatures(elementIds);
    } else if (typeof (window as any).highlightMultipleElements === 'function') {
      // Fallback alla funzione globale
      (window as any).highlightMultipleElements(elementIds);
    } else {
      // Fallback nel caso in cui nessuna delle funzioni sia disponibile
      console.log("Highlighting multiple elements:", elementIds);

      // Prima rimuoviamo tutte le evidenziazioni
      if (typeof (window as any).unhighlightElement === 'function') {
        (window as any).unhighlightElement();
      }
    }
  };

  // Funzione per rimuovere l'evidenziazione
  const unhighlightElement = () => {
    setHoveredElements([]);

    if (typeof (window as any).unhighlightElement === 'function') {
      (window as any).unhighlightElement();
    }
  };

  // Funzione per eliminare una place logica
  const deleteLogicalPlace = (id: string) => {
    // Remove from logicalPlaces state
    setLogicalPlaces(prev => prev.filter(place => place.id !== id));

    // Rimuovi anche la place logica da tutte le views che la contengono
    setViews(prev => prev.map(view => ({
      ...view,
      logicalPlaces: view.logicalPlaces.filter(placeId => placeId !== id)
    })));
  };

  // Funzione per eliminare una view
  const deleteView = (id: string) => {
    setViews(prev => prev.filter(view => view.id !== id));

    // Rimuovi anche le aggregazioni associate a questa view
    const updatedViewAggregations = { ...viewAggregations };
    delete updatedViewAggregations[id];
    setViewAggregations(updatedViewAggregations);
  };

  // Funzione per espandere/comprimere i dettagli di una place logica
  const toggleLogicalPlaceExpansion = (id: string) => {
    setExpandedLogicalPlaces(prev => {
      if (prev.includes(id)) {
        return prev.filter(placeId => placeId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Funzione per attivare/disattivare la modalità di selezione
  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    if (selectionMode) {
      // Se stiamo disattivando la modalità di selezione, deseleziona tutte le place
      setSelectedPlaces([]);
    }
  };

  // Funzione per selezionare/deselezionare una place
  const togglePlaceSelection = (place: Place) => {
    if (!selectionMode) return;

    setSelectedPlaces(prev => {
      const isSelected = prev.some(p => p.id === place.id);
      if (isSelected) {
        return prev.filter(p => p.id !== place.id);
      } else {
        return [...prev, place];
      }
    });
  };

  // Funzione per selezionare/deselezionare una place logica per una view
  const toggleLogicalPlaceSelection = (id: string) => {
    setSelectedLogicalPlaces(prev => {
      if (prev.includes(id)) {
        return prev.filter(placeId => placeId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Funzione per creare una place logica dalla selezione manuale
  const createLogicalPlaceFromSelection = () => {
    if (selectedPlaces.length === 0 || !newManualLogicalPlaceName.trim()) return;

    const newLogicalPlace: LogicalPlace = {
      id: `logical-${Date.now()}`,
      name: newManualLogicalPlaceName.trim(),
      conditions: [], // Place logica manuale, senza condizioni
      operator: 'AND', // Non rilevante per place logiche manuali
      physicalPlaces: selectedPlaces
    };

    setLogicalPlaces(prev => [...prev, newLogicalPlace]);
    setShowLogicalPlaceEditor(false);
    setSelectionMode(false);
    setSelectedPlaces([]);
    setNewManualLogicalPlaceName('');
  };

  // Funzione per creare una view dalla selezione di place logiche
  const createViewFromSelection = () => {
    if (selectedLogicalPlaces.length === 0 || !newViewName.trim()) return;

    const newView: View = {
      id: `view-${Date.now()}`,
      name: newViewName.trim(),
      logicalPlaces: selectedLogicalPlaces
    };

    setViews(prev => [...prev, newView]);
    setShowViewEditor(false);
    setSelectedLogicalPlaces([]);
    setNewViewName('');
  };

  // Funzione per ottenere tutti gli attributi unici dalle place fisiche di una view
  const getUniqueAttributesForView = (viewId: string): string[] => {
    const view = views.find(v => v.id === viewId);
    if (!view) return [];

    // Trova tutte le place logiche contenute nella view
    const viewLogicalPlaces = logicalPlaces.filter(lp =>
      view.logicalPlaces.includes(lp.id)
    );

    // Ottieni tutte le place fisiche dalle place logiche
    const allPhysicalPlaces = viewLogicalPlaces.flatMap(lp => lp.physicalPlaces);

    // Estrai tutti gli attributi unici
    const uniqueAttributes = new Set<string>();
    allPhysicalPlaces.forEach(place => {
      Object.keys(place.attributes).forEach(attr => {
        uniqueAttributes.add(attr);
      });
    });

    return Array.from(uniqueAttributes);
  };

  // Funzione per impostare il tipo di aggregazione per un attributo in una view
  const setViewAttributeAggregation = (viewId: string, attribute: string, aggregationType: 'MAX' | 'MIN' | 'AVG' | 'SUM' | 'COUNT' | null) => {
    setViewAggregations(prev => {
      const viewAggregation = prev[viewId] || {};

      // Se l'aggregazione è null, rimuovi l'attributo
      if (aggregationType === null) {
        const { [attribute]: _, ...rest } = viewAggregation;
        return {
          ...prev,
          [viewId]: rest
        };
      }

      // Altrimenti, imposta il nuovo tipo di aggregazione
      return {
        ...prev,
        [viewId]: {
          ...viewAggregation,
          [attribute]: aggregationType
        }
      };
    });
  };

  // Funzione per calcolare il valore aggregato per un attributo in una view
  const calculateAggregatedValue = (viewId: string, attribute: string, aggregationType: 'MAX' | 'MIN' | 'AVG' | 'SUM' | 'COUNT'): string => {
    const view = views.find(v => v.id === viewId);
    if (!view) return 'N/A';

    // Trova tutte le place logiche contenute nella view
    const viewLogicalPlaces = logicalPlaces.filter(lp =>
      view.logicalPlaces.includes(lp.id)
    );

    // Ottieni tutte le place fisiche dalle place logiche
    const allPhysicalPlaces = viewLogicalPlaces.flatMap(lp => lp.physicalPlaces);

    // Filtra le place che hanno l'attributo specificato e converti i valori in numeri
    const attributeValues = allPhysicalPlaces
      .map(place => place.attributes[attribute])
      .filter(value => value !== undefined)
      .map(value => Number(value))
      .filter(value => !isNaN(value));

    if (attributeValues.length === 0) return 'N/A';

    switch (aggregationType) {
      case 'MAX':
        return Math.max(...attributeValues).toString();
      case 'MIN':
        return Math.min(...attributeValues).toString();
      case 'AVG':
        return (attributeValues.reduce((sum, val) => sum + val, 0) / attributeValues.length).toFixed(2);
      case 'SUM':
        return attributeValues.reduce((sum, val) => sum + val, 0).toString();
      case 'COUNT':
        return attributeValues.length.toString();
      default:
        return 'N/A';
    }
  };

  // Funzione per renderizzare un elemento generico (place o edge)
  const renderElementSection = (title: string, elements: Element[]) => {
    if (elements.length === 0) return null;

    return (
      <div className="sidebar2-section">
        <h3>{title}</h3>
        <div className="sidebar2-items">
          {elements.map(element => (
            <div
              key={`${element.id}-${refreshKey}`}
              className={`sidebar2-item ${hoveredElements.includes(element.id) ? 'hovered' : ''}`}
              onMouseEnter={() => highlightElement(element.id)}
              onMouseLeave={unhighlightElement}
            >
              <h6>{element.id}</h6>
              {element.type === 'place' && Object.entries(element.attributes).map(([key, value]) => (
                <div key={`${key}-${refreshKey}`} className="sidebar2-attribute small">
                  <span>{key}: </span>
                  {value}
                </div>
              ))}
              {element.type === 'edge' && (
                <>
                  <div className="sidebar2-attribute small">
                    <span>Source: </span>
                    {(element as Edge).source}
                  </div>
                  <div className="sidebar2-attribute small">
                    <span>Target: </span>
                    {(element as Edge).target}
                  </div>
                  {Object.entries((element as Edge).attributes).map(([key, value]) => (
                    <div key={`${key}-${refreshKey}`} className="sidebar2-attribute small">
                      <span>{key}: </span>
                      {value}
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Renderizza la sezione delle place logiche
  const renderLogicalPlacesSection = () => {
    return (
      <div className="sidebar2-section logical-places-section">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h3 className="mb-0">Logical Places</h3>
          <div className="btn-group">
            {/* <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => setShowLogicalPlaceEditor(true)}
              title="Create a new logical place by selecting physical places"
            >
              + New LP
            </button> */}
          </div>
        </div>

        {logicalPlaces.length === 0 ? (
          <div className="sidebar2-empty-state">
            <p className="text-muted">No logical places defined yet.</p>
            <p className="text-muted small">Create logical places to group physical places based on conditions or manual selection.</p>
          </div>
        ) : (
          <div className="sidebar2-items">
            {logicalPlaces.map(logicalPlace => {
              const isExpanded = expandedLogicalPlaces.includes(logicalPlace.id);
              const physicalPlaceIds = logicalPlace.physicalPlaces.map(p => p.id);

              return (
                <div
                  key={`${logicalPlace.id}-${refreshKey}`}
                  className="sidebar2-logical-place mb-2 p-2 border rounded"
                  onMouseEnter={() => highlightMultipleElements(physicalPlaceIds)}
                  onMouseLeave={unhighlightElement}
                >
                  <div className="sidebar2-logical-place-header d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">{logicalPlace.name}</h6>
                    <div className="sidebar2-logical-place-actions">
                      <button
                        className="btn btn-sm btn-outline-secondary me-1"
                        title={isExpanded ? "Collapse" : "Expand"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLogicalPlaceExpansion(logicalPlace.id);
                        }}
                      >
                        {isExpanded ? "▲" : "▼"}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        title="Delete Logical Place"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLogicalPlace(logicalPlace.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="sidebar2-logical-place-info small text-muted mt-1">
                    {logicalPlace.conditions.length === 0 ? (
                      <span>Place logica creata manualmente</span>
                    ) : (
                      <span>Place logica creata dall'espressione: {logicalPlace.name}</span>
                    )}
                  </div>

                  {/* Mostra le condizioni se presenti */}
                  {logicalPlace.conditions.length > 0 && (
                    <div className="sidebar2-logical-place-conditions small mt-1">
                      <strong>{logicalPlace.name}:</strong> {logicalPlace.conditions.map((condition, index) => (
                        <span key={index}>
                          {index > 0 && <span> {logicalPlace.operator} </span>}
                          {condition.attribute} {condition.operator} {condition.value}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Display Physical Places (conditionally based on expansion) */}
                  {isExpanded && (
                    <div className="sidebar2-logical-place-physical mt-2">
                      <strong>Physical Places ({logicalPlace.physicalPlaces?.length || 0}):</strong>
                      {logicalPlace.physicalPlaces && logicalPlace.physicalPlaces.length > 0 ? (
                        <div className="sidebar2-logical-place-physical-list small" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                          {logicalPlace.physicalPlaces.map(place => (
                            <div
                              key={`${place.id}-${refreshKey}`}
                              className="sidebar2-logical-place-physical-item border-top pt-1 mt-1"
                            >
                              <div className="d-flex justify-content-between align-items-center">
                                <span>{place.id}</span>
                              </div>
                              {Object.entries(place.attributes).length > 0 && (
                                <div className="sidebar2-logical-place-physical-attributes text-muted" style={{ fontSize: '0.8em' }}>
                                  {Object.entries(place.attributes).map(([key, value]) => (
                                    <div key={`${place.id}-${key}-${refreshKey}`} className="sidebar2-attribute">
                                      <span>{key}: </span>
                                      {value}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted small fst-italic">No physical places match the conditions.</p>
                      )}
                    </div>
                  )}
                </div> // End sidebar2-logical-place
              );
            })}
          </div> // End sidebar2-items
        )}

        {/* --- Modals --- */}
        {/* Modal per creare/modificare place logiche manualmente */}
        {showLogicalPlaceEditor && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Create Manual Logical Place</h5>
                  <button type="button" className="btn-close" onClick={() => { setShowLogicalPlaceEditor(false); setSelectionMode(false); setSelectedPlaces([]); }}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="manualLogicalPlaceName" className="form-label">Logical Place Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="manualLogicalPlaceName"
                      value={newManualLogicalPlaceName}
                      onChange={(e) => setNewManualLogicalPlaceName(e.target.value)}
                      placeholder="Enter a name"
                    />
                  </div>
                  <p>Select physical places on the map or from the list below.</p>
                  <button
                    className={`btn ${selectionMode ? 'btn-warning' : 'btn-outline-primary'} mb-2 w-100`}
                    onClick={toggleSelectionMode}
                  >
                    {selectionMode ? 'Stop Selecting Places' : 'Start Selecting Places'}
                  </button>
                  {selectionMode && (
                    <div className="selected-places-list border p-2 rounded bg-light" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      <h6>Selected Places ({selectedPlaces.length}):</h6>
                      {selectedPlaces.length === 0 ? (
                        <p className="text-muted small">No places selected yet. Click on places in the list below or on the map.</p>
                      ) : (
                        <ul className="list-unstyled small mb-0">
                          {selectedPlaces.map(p => <li key={p.id}>{p.id}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowLogicalPlaceEditor(false); setSelectionMode(false); setSelectedPlaces([]); }}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={createLogicalPlaceFromSelection}
                    disabled={selectedPlaces.length === 0 || !newManualLogicalPlaceName.trim()}
                  >
                    Create Logical Place
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal per creare/modificare views */}
        {showViewEditor && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg"> {/* Larger modal for views */}
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Create View</h5>
                  <button type="button" className="btn-close" onClick={() => { setShowViewEditor(false); setSelectedLogicalPlaces([]); }}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="viewName" className="form-label">View Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="viewName"
                      value={newViewName}
                      onChange={(e) => setNewViewName(e.target.value)}
                      placeholder="Enter a name for the view"
                    />
                  </div>

                  {/* Select Logical Places */}
                  <div className="mb-3">
                    <label className="form-label">Select Logical Places for this View:</label>
                    <div className="logical-place-selection-list border p-2 rounded bg-light" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {logicalPlaces.length === 0 ? (
                        <p className="text-muted small">No logical places available. Create logical places first.</p>
                      ) : (
                        logicalPlaces.map(lp => (
                          <div key={lp.id} className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              value={lp.id}
                              id={`lp-select-${lp.id}`}
                              checked={selectedLogicalPlaces.includes(lp.id)}
                              onChange={() => toggleLogicalPlaceSelection(lp.id)}
                            />
                            <label className="form-check-label" htmlFor={`lp-select-${lp.id}`}>
                              {lp.name} ({lp.physicalPlaces?.length || 0} places)
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowViewEditor(false); setSelectedLogicalPlaces([]); }}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={createViewFromSelection}
                    disabled={selectedLogicalPlaces.length === 0 || !newViewName.trim()}
                  >
                    Create View
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div> // End logical-places-section
    );
  };

  // Renderizza la sezione delle views
  const renderViewsSection = () => {
    // if (views.length === 0) return null;

    return (
      <div className="sidebar2-section views-section">
        <h3>Views</h3>
        <div className="sidebar2-items">
          {views.map(view => {
            // Trova tutte le place logiche contenute nella view
            const viewLogicalPlaces = logicalPlaces.filter(lp =>
              view.logicalPlaces.includes(lp.id)
            );

            // Calcola tutte le place fisiche contenute nelle place logiche della view
            const allPhysicalPlaceIds = viewLogicalPlaces.flatMap(lp =>
              lp.physicalPlaces.map(p => p.id)
            );

            // Rimuovi duplicati
            const uniquePhysicalPlaceIds = [...new Set(allPhysicalPlaceIds)];

            // Ottieni tutti gli attributi unici per questa view
            const uniqueAttributes = getUniqueAttributesForView(view.id);

            return (
              <div
                key={`${view.id}-${refreshKey}`}
                className="sidebar2-view mb-2 p-2 border rounded"
                onMouseEnter={() => highlightMultipleElements(uniquePhysicalPlaceIds)}
                onMouseLeave={unhighlightElement}
              >
                <div className="sidebar2-view-header d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">{view.name}</h6>
                  <div className="sidebar2-view-actions">
                    <button
                      className="btn btn-sm btn-outline-danger"
                      title="Delete View"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteView(view.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {view.description && (
                  <div className="sidebar2-view-description small text-muted mt-1">
                    {view.description}
                  </div>
                )}

                <div className="sidebar2-view-logical-places mt-2">
                  <strong>Logical Places ({viewLogicalPlaces.length}):</strong>
                  <div className="sidebar2-view-logical-places-list small">
                    {viewLogicalPlaces.map(logicalPlace => (
                      <div
                        key={`${view.id}-${logicalPlace.id}-${refreshKey}`}
                        className="sidebar2-view-logical-place-item"
                      >
                        {logicalPlace.name} ({logicalPlace.physicalPlaces?.length || 0} places)
                      </div>
                    ))}
                  </div>
                </div>

                {/* Aggregation buttons and results for views */}
                {uniqueAttributes.length > 0 && (
                  <div className="sidebar2-view-aggregations mt-2">
                    <strong>Aggregations:</strong>
                    <div className="sidebar2-view-aggregations-list small">
                      {uniqueAttributes.map(attribute => {
                        const currentAggregation = viewAggregations[view.id]?.[attribute];

                        return (
                          <div
                            key={`${view.id}-${attribute}-${refreshKey}`}
                            className="sidebar2-view-aggregation-item mt-1"
                          >
                            <div className="d-flex align-items-center">
                              <span className="me-2">{attribute}:</span>
                              <div className="btn-group btn-group-sm">
                                <button
                                  className={`btn btn-sm ${currentAggregation === 'SUM' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                  onClick={() => setViewAttributeAggregation(view.id, attribute, currentAggregation === 'SUM' ? null : 'SUM')}
                                >
                                  SUM
                                </button>
                                <button
                                  className={`btn btn-sm ${currentAggregation === 'AVG' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                  onClick={() => setViewAttributeAggregation(view.id, attribute, currentAggregation === 'AVG' ? null : 'AVG')}
                                >
                                  AVG
                                </button>
                                <button
                                  className={`btn btn-sm ${currentAggregation === 'MAX' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                  onClick={() => setViewAttributeAggregation(view.id, attribute, currentAggregation === 'MAX' ? null : 'MAX')}
                                >
                                  MAX
                                </button>
                                <button
                                  className={`btn btn-sm ${currentAggregation === 'MIN' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                  onClick={() => setViewAttributeAggregation(view.id, attribute, currentAggregation === 'MIN' ? null : 'MIN')}
                                >
                                  MIN
                                </button>
                                <button
                                  className={`btn btn-sm ${currentAggregation === 'COUNT' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                  onClick={() => setViewAttributeAggregation(view.id, attribute, currentAggregation === 'COUNT' ? null : 'COUNT')}
                                >
                                  CC
                                </button>
                              </div>
                            </div>

                            {/* Mostra il risultato dell'aggregazione se è selezionata */}
                            {currentAggregation && (
                              <div className="sidebar2-view-aggregation-result mt-1 ps-2">
                                <strong>{currentAggregation}:</strong> {calculateAggregatedValue(view.id, attribute, currentAggregation)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div >
          {/* <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}> */}
          {/* <div className="modal-dialog modal-lg"> Larger modal for views */}
          {/* <div className="modal-content"> */}
          {/* <div className="modal-header"> */}
          {/* <h5 className="modal-title">Create View</h5>
                  <button type="button" className="btn-close" onClick={() => { setShowViewEditor(false); setSelectedLogicalPlaces([]); }}></button> */}
          {/* </div> */}
          {/* <div className="modal-body"> */}
          <div className="mb-3">
            <label htmlFor="viewName" className="form-label">Create View</label>
            <input
              type="text"
              className="form-control"
              id="viewName"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="Enter a name for the view"
            />
            {/* </div> */}

            {/* Select Logical Places */}
            <div className="mb-3">
              <label className="form-label">Select Logical Places for this View:</label>
              <div className="logical-place-selection-list border p-2 rounded bg-light" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {logicalPlaces.length === 0 ? (
                  <p className="text-muted small">No logical places available. Create logical places first.</p>
                ) : (
                  logicalPlaces.map(lp => (
                    <div key={lp.id} className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        value={lp.id}
                        id={`lp-select-${lp.id}`}
                        checked={selectedLogicalPlaces.includes(lp.id)}
                        onChange={() => toggleLogicalPlaceSelection(lp.id)}
                      />
                      <label className="form-check-label" htmlFor={`lp-select-${lp.id}`}>
                        {lp.name} ({lp.physicalPlaces?.length || 0} places)
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          {/* <div className="modal-footer"> */}
          <button type="button" className="btn btn-secondary" onClick={() => { setShowViewEditor(false); setSelectedLogicalPlaces([]); }}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={createViewFromSelection}
            disabled={selectedLogicalPlaces.length === 0 || !newViewName.trim()}
          >
            Create View
          </button>
          {/* </div> */}
          {/* </div> */}
          {/* </div> */}
        </div>
        {/* <button
          className="btn btn-sm btn-outline-primary"
          onClick={() => setShowViewEditor(true)}
          title="Create a new view from logical places"
        >
          + New View
        </button> */}
      </div>
    );
  };

  // Mostra sempre la sezione Places anche se vuota, per debug o selection mode
  const debugPlaces = (
    <div className="sidebar2-section">
      <h3>Physical Places (Debug/Select)</h3>
      <div className="sidebar2-items">
        {places.length === 0 ? (
          <div className="sidebar2-item">
            <h6>No physical places loaded</h6>
            <div className="sidebar2-attribute small text-muted">
              Waiting for map data...
            </div>
          </div>
        ) : (
          places.map(place => {
            const isSelected = selectedPlaces.some(p => p.id === place.id);

            return (
              <div
                key={`${place.id}-${refreshKey}`}
                className={`sidebar2-item
                  ${hoveredElements.includes(place.id) ? 'hovered' : ''}
                  ${isSelected ? 'selected' : ''}`}
                onMouseEnter={() => highlightElement(place.id)}
                onMouseLeave={unhighlightElement}
                onClick={() => togglePlaceSelection(place)}
                style={selectionMode ? { cursor: 'pointer' } : {}}
              >
                <h6>
                  {selectionMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="me-2"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  {place.id}
                </h6>
                {Object.entries(place.attributes).map(([key, value]) => (
                  <div key={`${key}-${refreshKey}`} className="sidebar2-attribute small">
                    <span>{key}: </span>
                    {value}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // Funzione per mostrare/nascondere la sidebar
  const toggleSidebar = () => {
    setIsVisible(!isVisible);
  };

  // Renderizza il pulsante per mostrare/nascondere la sidebar
  const renderToggleButton = () => (
    <button
      className={`sidebar2-toggle-button ${!isVisible ? 'sidebar2-hidden' : ''}`}
      onClick={toggleSidebar}
      title={isVisible ? 'Hide Sidebar' : 'Show Sidebar'}
    >
      {isVisible ? '▶' : '◀'}
    </button>
  );

  return (
    <>
      {renderToggleButton()}
      <div className={`sidebar2 ${!isVisible ? 'sidebar2-hidden' : ''}`}>
        {/* <div className="sidebar2-header mb-2">
          <h3 className="mb-1 text-nowrap">Map Elements</h3>
          <button
            className="sidebar2-refresh-button btn btn-sm btn-outline-secondary"
            onClick={fetchElements}
            title="Refresh elements from map"
          >
            Update Elements 🔄
          </button>
        </div> */}

        {/* Main Content Sections */}
        {renderViewsSection()}
        {renderLogicalPlacesSection()}

        {/* Conditionally render physical places list only if in selection mode */}
        {selectionMode && debugPlaces}

        {/* Render other sections */}
        {renderElementSection("Places", places)}
        {renderElementSection("Edges", edges)}
      </div>
    </>
  );
};

export default Sidebar2;
