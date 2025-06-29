import React, { useState, useEffect } from 'react';
import cytoscape from 'cytoscape';
import "./Sidebar.css";
import { set } from 'ol/transform';

interface SidebarProps {
  onDrawPolygon: () => void;
  onDrawEdge: () => void;
  onSelect: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onExportModel: () => void;
  canDrawEdge: boolean;
  hasSelectedElement: boolean;
  // onRenameElement: (newId: string) => void;
  onRenameElement: (newName: string) => void;
}

// interface Attribute {
//   name: string;
//   value: string;
// }

interface Element {
  id: string;
  name: string;
  type: 'place' | 'edge';
  source?: string;
  target?: string;
  attributes: Record<string, string>;
}

interface Condition {
  attribute: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: string;
}

interface Expression {
  id: string;
  name: string;
  conditions: Condition[];
  operator: 'AND' | 'OR';
}

const Sidebar: React.FC<SidebarProps> = ({
  onDrawPolygon,
  onDrawEdge,
  onSelect,
  onDelete,
  onUndo,
  // onExportModel,
  canDrawEdge,
  hasSelectedElement,
  onRenameElement
}) => {
  const [activeButton, setActiveButton] = useState<'polygon' | 'edge' | 'select' | null>(null);
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [newAttributeValue, setNewAttributeValue] = useState('');
  // const [newElementId, setNewElementId] = useState('');
  const [newElementName, setNewElementName] = useState('');
  const [pendingRename, setPendingRename] = useState<{ id: string, newId: string } | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isMapVisible, setIsMapVisible] = useState(true);

  // Stati per le espressioni condizionali
  const [expressions, setExpressions] = useState<Expression[]>([]);
  // const [currentExpression, setCurrentExpression] = useState<Expression | null>(null);
  const [showExpressionEditor, setShowExpressionEditor] = useState(true);
  const [newExpressionName, setNewExpressionName] = useState('');
  const [expressionOperator, setExpressionOperator] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<Condition[]>([{ attribute: '', operator: '==', value: '' }]);
  // const [filteredElements, setFilteredElements] = useState<Element[]>([]);
  // const [isFilterActive, setIsFilterActive] = useState(false);


  // Funzione per aggiornare gli elementi dalla mappa
  const updateElements = (newElements: Element[], newSelectedElement?: Element | null) => {
    setElements(newElements);

    // Aggiorna anche gli elementi filtrati se un filtro è attivo
    // if (isFilterActive && currentExpression) {
    //   const filtered = newElements.filter(element => 
    //     evaluateExpression(element, currentExpression)
    //   );
    // }
    //   setFilteredElements(filtered);
    // } else {
    //   setFilteredElements(newElements);
    // }

    // Se viene passato un nuovo elemento selezionato, aggiornalo
    if (newSelectedElement !== undefined) {
      setSelectedElement(newSelectedElement);
      if (newSelectedElement) {
        setNewElementName(newSelectedElement.name);
      } else {
        setNewElementName('');
      }
    } else if (selectedElement) {
      // Se l'elemento selezionato è stato aggiornato, aggiorna anche quello
      const updatedSelectedElement = newElements.find(el => el.id === selectedElement.id);
      if (updatedSelectedElement) {
        setSelectedElement(updatedSelectedElement);
        setNewElementName(updatedSelectedElement.name);
      } else {
        // Se l'elemento selezionato non esiste più, deselezionalo
        setSelectedElement(null);
        setNewElementName('');
      }
    }
  };

  // Esponi la funzione updateElements globalmente
  useEffect(() => {
    (window as any).updateSidebarElements = updateElements;
  }, []);

  // Effetto per applicare la rinomina in sospeso quando cambia la selezione
  useEffect(() => {
    if (pendingRename) {
      console.log('Applicazione rinomina in sospeso:', pendingRename);
      onRenameElement(pendingRename.newId);
      setPendingRename(null);
    }
  }, [pendingRename, onRenameElement]);

  // Funzione per valutare una condizione su un elemento
  const evaluateCondition = (element: Element, condition: Condition): boolean => {
    // Ignora gli archi se stiamo filtrando per attributi di place
    if (element.type !== 'place') return false;

    const attributeValue = element.attributes[condition.attribute];
    if (attributeValue === undefined) return false;

    // Converti i valori in numeri se possibile per confronti numerici
    const elementValue = !isNaN(Number(attributeValue)) ? Number(attributeValue) : attributeValue;
    const conditionValue = !isNaN(Number(condition.value)) ? Number(condition.value) : condition.value;

    switch (condition.operator) {
      case '==': return elementValue === conditionValue;
      case '!=': return elementValue !== conditionValue;
      case '>': return elementValue > conditionValue;
      case '<': return elementValue < conditionValue;
      case '>=': return elementValue >= conditionValue;
      case '<=': return elementValue <= conditionValue;
      default: return false;
    }
  };

  // Funzione per valutare un'espressione su un elemento
  const evaluateExpression = (element: Element, expression: Expression): boolean => {
    if (expression.conditions.length === 0) return true;

    if (expression.operator === 'AND') {
      return expression.conditions.every(condition =>
        evaluateCondition(element, condition)
      );
    } else { // OR
      return expression.conditions.some(condition =>
        evaluateCondition(element, condition)
      );
    }
  };

  // Funzione per applicare un'espressione come filtro
  // const applyExpressionFilter = (expression: Expression | null) => {
  //   if (!expression) {
  //     // setIsFilterActive(false);
  //     // setFilteredElements(elements);
  //     setCurrentExpression(null);
  //     return;
  //   }

  //   setCurrentExpression(expression);
  //   // setIsFilterActive(true);

  //   // const filtered = elements.filter(element => 
  //   //   evaluateExpression(element, expression)
  //   // );
  //   // setFilteredElements(filtered);
  // };

  // Funzione per aggiungere una nuova condizione vuota
  const addCondition = () => {
    setConditions([...conditions, { attribute: '', operator: '==', value: '' }]);
  };

  // Funzione per rimuovere una condizione
  const removeCondition = (index: number) => {
    const newConditions = [...conditions];
    newConditions.splice(index, 1);
    setConditions(newConditions);
  };

  // Funzione per aggiornare una condizione
  const updateCondition = (index: number, field: keyof Condition, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = {
      ...newConditions[index],
      [field]: field === 'operator'
        ? value as '==' | '!=' | '>' | '<' | '>=' | '<='
        : value
    };
    setConditions(newConditions);
  };

  // Funzione per salvare l'espressione corrente
  const saveExpression = () => {
    if (!newExpressionName || conditions.length === 0) return;

    const newExpression: Expression = {
      id: Date.now().toString(), // ID unico basato sul timestamp
      name: newExpressionName,
      conditions: [...conditions],
      operator: expressionOperator
    };

    setExpressions([...expressions, newExpression]);
    resetExpressionEditor();
    createLogicalPlaceFromExpression(newExpression);
  };

  // Funzione per creare una place logica da un'espressione
  const createLogicalPlaceFromExpression = (expression: Expression) => {
    // Filtra le place che soddisfano l'espressione
    const matchingPlaces = elements
      .filter(element => element.type === 'place')
      .filter(element => evaluateExpression(element, expression));

    // Crea una nuova place logica
    const logicalPlace = {
      id: `logical-${expression.id}`,
      name: expression.name,
      description: `Place logica creata dall'espressione: ${expression.name}`,
      conditions: [...expression.conditions],
      operator: expression.operator,
      physicalPlaces: matchingPlaces
    };

    // Invia la place logica alla sidebar destra
    if (typeof (window as any).addLogicalPlace === 'function') {
      (window as any).addLogicalPlace(logicalPlace);
      console.log('Place logica creata:', logicalPlace);
    } else {
      console.error('Funzione addLogicalPlace non disponibile');
    }
  };

  // Funzione per resettare l'editor di espressioni
  const resetExpressionEditor = () => {
    setNewExpressionName('');
    setExpressionOperator('AND');
    setConditions([{ attribute: '', operator: '==', value: '' }]);
    // setShowExpressionEditor(false);
  };

  // // Funzione per eliminare un'espressione
  // const deleteExpression = (id: string) => {
  //   const newExpressions = expressions.filter(expr => expr.id !== id);
  //   setExpressions(newExpressions);

  //   // Se l'espressione eliminata era quella attiva, disattiva il filtro
  //   if (currentExpression && currentExpression.id === id) {
  //     applyExpressionFilter(null);
  //   }
  // };

  const handleRemoveMap = () => {
    const mapDiv = document.getElementById('map');
    const pgDiv = document.getElementById('graph-container');
    if (mapDiv && mapDiv.style.display === 'none') {
      mapDiv.style.display = 'block';
      if (pgDiv) pgDiv.style.display = 'none';
      setIsMapVisible(true);
    } else {
      if (mapDiv) mapDiv.style.display = 'none';
      if (pgDiv) pgDiv.style.display = 'block';
      setIsMapVisible(false);


    // Estrai nodi (type: place)
    const nodes = elements
      .filter(item => item.type === 'place')
      .map(place => ({
        data: {
          id: place.id,
          label: place.name
        }
      }));

    // Estrai archi (type: edge)
    const edges = elements
      .filter(item => item.type === 'edge')
      .map(edge => ({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target
        }
      }));

    // Inizializza Cytoscape
    const cy = cytoscape({
      container: document.getElementById('graph-container'),
      elements: [...nodes, ...edges],
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'background-color': '#FFF',
            'border-color': '#000',
            'border-width': 1,
            'border-style': 'solid',
            'shape': 'ellipse',
            'text-wrap': 'wrap',
            'color': '#000',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#000',
            'target-arrow-color': '#aaa',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
          }
        }
      ],
      layout: {
        name: 'grid',
        fit: true,
        padding: 20
      }
    });

    }
  }

  const handleDrawPolygon = () => {
    // Applica eventuali rinomina in sospeso prima di cambiare modalità
    applyPendingRename();

    // Disattiva la modalità di selezione prima di attivare il disegno
    const selectionManager = (window as any).selectionManager;
    if (selectionManager && typeof selectionManager.deactivateSelection === 'function') {
      selectionManager.deactivateSelection();
    }

    setActiveButton('polygon');
    onDrawPolygon();
  };

  const handleDrawEdge = () => {
    // Applica eventuali rinomina in sospeso prima di cambiare modalità
    applyPendingRename();

    // Disattiva la modalità di selezione prima di attivare il disegno
    const selectionManager = (window as any).selectionManager;
    if (selectionManager && typeof selectionManager.deactivateSelection === 'function') {
      selectionManager.deactivateSelection();
    }

    setActiveButton('edge');
    onDrawEdge();
  };

  const handleSelect = () => {
    // Applica eventuali rinomina in sospeso prima di cambiare modalità
    applyPendingRename();

    setActiveButton('select');
    onSelect();
  };

  const handleDelete = () => {
    // Applica eventuali rinomina in sospeso prima di eliminare
    applyPendingRename();

    onDelete();
  };

  const handleUndo = () => {
    // Applica eventuali rinomina in sospeso prima di annullare
    applyPendingRename();

    onUndo();
  };

  // Funzione per applicare la rinomina in sospeso
  // const applyPendingRename = () => {
  //   if (selectedElement && newElementId && newElementId !== selectedElement.id) {
  //     console.log('Applicazione rinomina prima del cambio:', selectedElement.id, '->', newElementId);
  //     onRenameElement(newElementId);
  //   }
  // };
  const applyPendingRename = () => {
    if (selectedElement && newElementName && newElementName !== selectedElement.name) {
      console.log('Applicazione rinomina nome:', selectedElement.name, '->', newElementName);
      onRenameElement(newElementName);
    }
  };

  const handleAddAttribute = () => {
    if (!selectedElement || !newAttributeName || !newAttributeValue) return;

    // Chiama la funzione globale per aggiungere l'attributo
    if (typeof (window as any).addAttribute === 'function') {
      (window as any).addAttribute(selectedElement.id, newAttributeName, newAttributeValue);
    }

    setNewAttributeName('');
    setNewAttributeValue('');
  };

  const handleRemoveAttribute = (attributeName: string) => {
    if (!selectedElement) return;

    // Chiama la funzione globale per rimuovere l'attributo
    if (typeof (window as any).removeAttribute === 'function') {
      (window as any).removeAttribute(selectedElement.id, attributeName);
    }
  };

  const handleRenameElement = () => {
    if (!selectedElement || !newElementName.trim() || newElementName === selectedElement.name) return;

    // Applica immediatamente la rinomina
    onRenameElement(newElementName);
  };

  // Funzione per mostrare/nascondere la sidebar
  const toggleSidebar = () => {
    setIsVisible(!isVisible);
  };

  // Estrai tutti gli attributi unici dalle place per il dropdown
  const getUniqueAttributes = (): string[] => {
    const attributes = new Set<string>();
    if (elements) { 
      elements.forEach(element => {
        if (element.type === 'place') {
          Object.keys(element.attributes).forEach(attr => attributes.add(attr));
        }
      });
    }
    return Array.from(attributes).sort();
  };

  // Renderizza il pulsante per mostrare/nascondere la sidebar
  const renderToggleButton = () => (
    <button
      className={`sidebar-toggle-button ${!isVisible ? 'sidebar-hidden' : ''}`}
      onClick={toggleSidebar}
    >
      {isVisible ? '◀' : '▶'}
    </button>
  );
  
  // Renderizza il pulsante per mostrare/nascondere la sidebar
  const renderMapButton = () => (
    <button
      className={`map-toggle-button ${!isVisible ? 'map-hidden' : ''}`}
      onClick={handleRemoveMap}
    >
    {isMapVisible ? '🌐' : '🗺️'}
    </button>
  );

  // Renderizza l'editor di espressioni
  const renderExpressionEditor = () => (
    <div className="expression-editor">
      <h5>Create Logical Place</h5>

      <div className="mb-3">
        <label htmlFor="expressionName" className="form-label">Name</label>
        <input
          type="text"
          className="form-control"
          id="expressionName"
          value={newExpressionName}
          onChange={(e) => setNewExpressionName(e.target.value)}
          placeholder="Logical Place Name"
        />
      </div>

      {/* <div className="mb-3">
        <label className="form-label">Combine Conditions with</label>
        <div className="btn-group w-100">
          <button
            className={`btn ${expressionOperator === 'AND' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setExpressionOperator('AND')}
          >
            AND
          </button>
          <button
            className={`btn ${expressionOperator === 'OR' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setExpressionOperator('OR')}
          >
            OR
          </button>
        </div>
      </div> */}

      <div className="conditions-container">
        <label className="form-label">Conditions</label>

        {conditions.length === 0 ? (
          <p className="text-muted">No conditions added yet. Add a condition below.</p>
        ) : (
          conditions.map((condition, index) => (
            <div key={index} className="condition-row mb-2">
              <div className="row g-2">
                <div className="col">
                  <select
                    className="form-select form-select-sm"
                    value={condition.attribute}
                    onChange={(e) => updateCondition(index, 'attribute', e.target.value)}
                  >
                    <option value="">Select attribute</option>
                    {getUniqueAttributes().map(attr => (
                      <option key={attr} value={attr}>{attr}</option>
                    ))}
                  </select>
                </div>
                <div className="col-3">
                  <select
                    className="form-select form-select-sm"
                    value={condition.operator}
                    onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                  >
                    <option value="==">==</option>
                    <option value="!=">!=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                  </select>
                </div>
                <div className="col">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={condition.value}
                    onChange={(e) => updateCondition(index, 'value', e.target.value)}
                    placeholder="Value"
                  />
                </div>
                <div className="col-auto">
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => removeCondition(index)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        <div className="mt-2">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={addCondition}
          >
            + Add Condition
          </button>
        </div>
      </div>

      <div className="mt-3 justify-content-end">
        <button
          className="btn btn-secondary me-2"
          onClick={resetExpressionEditor}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            setExpressionOperator('AND')
            saveExpression()
            // console.log(expressions);
          }}
          disabled={!newExpressionName || conditions.length === 0}
        >
          Create Logical Place
        </button>
      </div>
    </div>
  );

  // Renderizza la lista delle espressioni salvate
  const renderExpressionsList = () => (
    <div className="expressions-list">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">Logical Places</h5>
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={() => setShowExpressionEditor(true)}
        >
          +
        </button>
      </div>
      {/* 
      {expressions.length === 0 ? (
        <p className="text-muted">No logical places defined yet.</p>
      ) : (
        <div className="list-group">
          {expressions.map(expr => (
            <div
              key={expr.id}
              className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${currentExpression?.id === expr.id ? 'active' : ''}`}
            >
              <div className="expression-info" onClick={() => applyExpressionFilter(expr)}>
                <div className="expression-name">{expr.name}</div>
                <div className="expression-details">
                  {expr.conditions.map((cond, i) => (
                    <span key={i}>
                      {i > 0 && <span className="operator"> {expr.operator} </span>}
                      <span className="condition">{cond.attribute} {cond.operator} {cond.value}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="expression-actions">
                <button
                  className="btn btn-sm btn-success me-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    createLogicalPlaceFromExpression(expr);
                  }}
                  title="Create logical place from this expression"
                >
                  Create Place
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteExpression(expr.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isFilterActive && (
        <div className="mt-2">
          <button
            className="btn btn-sm btn-warning"
            onClick={() => applyExpressionFilter(null)}
          >
            Clear Filter
          </button>
        </div>
      )} */}
    </div>
  );

  return (
    <>
      {renderToggleButton()}
      {renderMapButton()}
      <div className={`sidebar ${!isVisible ? 'sidebar-hidden' : ''}`}>
        <div className="control-panel">
          <div className="">
            <h5>Tools</h5>
            <button
              className={`btn ${activeButton === 'polygon' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={handleDrawPolygon}
            >
              Place
            </button>

            <button
              className={`btn ${activeButton === 'edge' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={handleDrawEdge}
              disabled={!canDrawEdge}
              title={!canDrawEdge ? "At least two polygons are needed to draw an edge" : ""}
            >
              Edge
            </button>

            <button
              className={`btn ${activeButton === 'select' ? 'btn-primary' : 'btn-outline-primary'} btn-wide`}
              onClick={handleSelect}
            >
              Select
            </button>

            <button
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={!hasSelectedElement}
              title={!hasSelectedElement ? "Select an element to delete first" : ""}
            >
              Delete
            </button>

            <button
              className="btn btn-warning"
              onClick={handleUndo}
            >
              Undo
            </button>
          </div>
        </div>

        <div className="attribute-panel">
          <h5>Attributes</h5>

          <div className="attributes-container">
            <h5>
              Attributes of the Place
              <span className="element-type-badge element-type-place">
                Place
              </span>
            </h5>

            {selectedElement && selectedElement.type === 'place' ? (
              <>
                <div className="element-id-editor">
                  <label htmlFor="elementId" className="form-label">ID Element</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      id="elementId"
                      value={newElementName}
                      onChange={(e) => setNewElementName(e.target.value)}
                      placeholder="Enter a new Name"
                    />
                    <button
                      className="btn btn-outline-primary"
                      type="button"
                      onClick={handleRenameElement}
                    // disabled={!newAttributeName.trim() || newElementName === selectedElement.name}
                    >
                      Rename
                    </button>
                  </div>
                </div>

                {Object.keys(selectedElement.attributes).length > 0 ? (
                  <table className="attributes-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Value</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(selectedElement.attributes).map(([name, value]) => (
                        <tr key={name}>
                          <td>{name}</td>
                          <td>{value}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleRemoveAttribute(name)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No attribute present</p>
                )}

                <div className="row g-2 mb-3">
                  <div className="col">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Name"
                      value={newAttributeName}
                      onChange={(e) => setNewAttributeName(e.target.value)}
                    />
                  </div>
                  <div className="col">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Value"
                      value={newAttributeValue}
                      onChange={(e) => setNewAttributeValue(e.target.value)}
                    />
                  </div>
                  <div className="col-auto">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={handleAddAttribute}
                      disabled={!newAttributeName.trim() || !newAttributeValue.trim()}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-selection-message">
                <p>Select a place using the "Select Item" button to view and edit its attributes.</p>
              </div>
            )}
          </div>
        </div>

        <div className="expression-panel">
          {showExpressionEditor ? renderExpressionEditor() : renderExpressionsList()}
        </div>

        {/* <div className="mt-4">
          <button 
            className="btn btn-success w-100 mb-2"
            onClick={onExportModel}
          >
            Export Model (JSON)
          </button>
          <button 
            className="btn btn-primary w-100"
            onClick={() => (window as any).triggerFileInput?.()}
          >
            Import Model
          </button>
        </div> */}
      </div>
    </>
  );
};

export default Sidebar;
