import { is } from "../../../example/lib/util/Util";
import WeightedGraph from '../util/WeightedGraph';
import TimeUtil from '../util/TimeUtil';
import AssignmentUtil from "../util/AssignmentUtil";
import { isEventSubProcess, isMessageFlow, isSequenceFlow } from "../util/ModelUtil";
import EventBehaviors from './EventBehaviors';
import { GUARD_VIOLATION_EVENT, NOT_REACHABLE_EVENT, RESET_SIMULATION_EVENT, PLAY_SIMULATION_EVENT, NO_ROOT_EVENT } from "../../util/EventHelper";


const HIGH_PRIORITY = 1500;
export default function ActivityBehavior(
  simulator,
  scopeBehavior,
  transactionBehavior,
  animation,
  elementRegistry,
  spaceModeler,
  eventBus,
  pauseSimulation,
  olcModdle,
  elementColors,
) {
  this._simulator = simulator;
  this._scopeBehavior = scopeBehavior;
  this._transactionBehavior = transactionBehavior;
  this._animation = animation;
  this._elementRegistry = elementRegistry;
  this._spaceModeler = spaceModeler;
  this._eventBus = eventBus;
  this._elementColors = elementColors;
  this._pauseSimulation = pauseSimulation;
  this._time = new TimeUtil(0);
  this._olcModdle = olcModdle;
  this._eventBehaviors = new EventBehaviors(simulator, elementRegistry, scopeBehavior, this);
  this._initialRoot = null; // Inizializza la variabile per la root iniziale
  this.tokenColor = null

  this._registerBehaviors(simulator);

  // Register resetSimulation event listener
  this._eventBus.on(RESET_SIMULATION_EVENT, () => {
    // this.resetRoot();
    this._simulator._processStateMap.clear();
    this._resetPlaceCircles();
    localStorage.setItem('processStateMap', '{}');
  });

  // Register animation end event listener
  // this._eventBus.on('animation.end', () => {
  //   this._simulator._processStateMap.clear();
  //   this._resetPlaceCircles();
  //   localStorage.setItem('processStateMap', '{}');
  // });
}

ActivityBehavior.prototype._registerBehaviors = function (simulator) {
  const elements = [
    'bpmn:BusinessRuleTask',
    'bpmn:CallActivity',
    'bpmn:ManualTask',
    'bpmn:ScriptTask',
    'bpmn:ServiceTask',
    'bpmn:Task',
    'bpmn:UserTask',
    'space:Transition',
    'space:Place'
  ];

  elements.forEach(element => simulator.registerBehavior(element, this));

  const boundaryEvents = [
    'bpmn:BoundaryEvent',
    'bpmn:IntermediateCatchEvent',
    'bpmn:ConditionalEventDefinition'
  ];

  boundaryEvents.forEach(element => {
    simulator.registerBehavior(element, this);
  });
};

ActivityBehavior.$inject = [
  'simulator',
  'scopeBehavior',
  'transactionBehavior',
  'animation',
  'elementRegistry',
  'spaceModeler',
  'eventBus',
  'pauseSimulation',
  'olcModdle',
  'elementColors'
];

ActivityBehavior.prototype.getSpaceWeighedPath = function (context) {
  const { element } = context;

  const places = this._spaceModeler._places.get('Elements');
  const place = places.filter(e => is(e, 'space:Place'));
  const connections = places.filter(e => is(e, 'space:Transition'));
  this._initialRoot = this._simulator._processStateMap.get(element.parent.businessObject.id + '.position');

  if (!this._initialRoot) {
    this._initialRoot = getRoot(element, places);
    this._simulator._processStateMap.set(element.parent.businessObject.id + '.position', this._initialRoot);
    const mapArray = Array.from(this._simulator._processStateMap.entries());
    const mapJson = JSON.stringify(mapArray);
    localStorage.setItem('processStateMap', mapJson);
    document.dispatchEvent(new CustomEvent('processStateMapUpdate'));
  }

  const goal = this.getDestination(element, places);
  element.businessObject.destination = goal;

  const g = new WeightedGraph();
  place.forEach(p => g.addVertex(p.id));
  connections.forEach(conn => {
    const weight = parseInt(conn.name);
    if (!isNaN(weight)) {
      g.addEdge(conn.sourcePlace.id, conn.targetPlace.id, weight);
    } else {
      g.addEdge(conn.sourcePlace.id, conn.targetPlace.id, 1);
    }
  });

  const shortestPath = g.Dijkstra(this._initialRoot, goal);
  // const shortestPath = g.Dijkstra(this._simulator._processStateMap.get(element.parent.businessObject.id + '.position'), goal);
  const fullPath = shortestPath.slice(1).map((id, index) => {
    const connection = connections.find(c => c.sourcePlace.id === shortestPath[index] && c.targetPlace.id === id);
    if (!connection) {
      console.warn('Connessione non trovata per il percorso più breve:', shortestPath[index], id);
      return null;
    }
    return connection;
  }).filter(Boolean);

  return fullPath;
};

function getRoot(element, places) {
  if (element && element.parent && element.parent.businessObject) {
    const rootId = element.parent.businessObject.root;
    const rootPlace = places.find(place => place.id === rootId);
    return rootPlace ? rootPlace.id : null;
  } else {
    return null;
  }
}

ActivityBehavior.prototype.getDestination = function (element, places) {
  if (element && element.businessObject) {
    const destinationId = element.businessObject.destination;
    let destinationPlace
    if (destinationId && !destinationId.includes('Place_')) {
      const destinationName = this._simulator._processStateMap.get(element.businessObject.$parent.id + '.' + destinationId);
      destinationPlace = places.find(place => place.name === destinationName);
      element.businessObject.destination = destinationPlace ? destinationPlace.id : null;
    } else {
      destinationPlace = places.find(place => place.id === destinationId);
    }
    return destinationPlace ? destinationPlace.id : null;
  } else {
    return null;
  }
}

ActivityBehavior.prototype.enter = async function (context) {
  const { element } = context;

  const event = this._triggerMessages(context);
  if (event) {
    return this.signalOnEvent(context, event);
  }

  if ((element.businessObject.guard !== undefined) && (element.businessObject.guard !== "")) {
    if (!this._evaluateCondition(element, element.businessObject.guard)) {
      const modeling = this._spaceModeler.get('modeling');
      modeling.setColor([element], {
        stroke: 'red',
        fill: '#ffa5a5'
      });
      this._eventBus.fire(GUARD_VIOLATION_EVENT, { element: element });
      setTimeout(function () {
        modeling.setColor([element], {
          stroke: 'black',
          fill: 'white'
        });
      }, 1000);
    } else {
      if (!this._handleBoundaryEvents(context)) {
        this.processAssignments(context);
        this._simulator.exit(context);
      }
    }
  } else {
    if (!this._handleBoundaryEvents(context)) {
      this.processAssignments(context);
      this._simulator.exit(context);
    }
  }
};

ActivityBehavior.prototype._evaluateCondition = function (element, condition) {
  if ((condition !== undefined) && (condition !== "")) {
    const operatorsRegex = new RegExp(`(${["==", "===", "!=", "!==", "<", ">", "<=", ">="].map(op => op.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`);
    const expressionElements = condition.split(operatorsRegex).map(str => str.trim()).filter(Boolean);
    let e1 = expressionElements[0];
    let e2 = expressionElements[2];

    if (expressionElements[0].includes('.') && expressionElements[0].includes('$')) {
      let key = expressionElements[0].split('.')[0].substring(1)
      if (this._simulator._processStateMap.get(element.businessObject.$parent.id + '.' + key)) {
        expressionElements[0] = this._simulator._processStateMap.get(element.businessObject.$parent.id + '.' + key) + '.' + expressionElements[0].split('.')[1]
      }
    }

    if (expressionElements[0].includes('PLACES')) {
      let attribute = expressionElements[0].split('.')[1];
      for (let [key, value] of this._simulator._processStateMap.entries()) {
        if (key.startsWith('Place_') && key.endsWith(attribute) && value === e2)
          return true
      }
      return false
    }

    if (!expressionElements[0].includes('.'))
      e1 = this._simulator._processStateMap.get(element.businessObject.$parent.id + '.' + expressionElements[0]);
    else e1 = this._simulator._processStateMap.get('Place_' + expressionElements[0]);

    let expression = e1 + expressionElements[1] + e2;

    return eval(expression);
  }
}

ActivityBehavior.prototype._handleBoundaryEvents = function (context) {
  const { element, scope } = context;
  const flows = this.getSpaceWeighedPath({ element: element });
  const elements = this._spaceModeler._canvaspace.canvas._elementRegistry._elements;

  element.attachers.forEach(attacher => {
    // if ((attacher.businessObject.eventDefinitions[0].condition.body == 'UNREACHABLE')) {
    //   if (flows.some(flow => !elements.hasOwnProperty(flow.id))) {
    //     this._simulator.enter({
    //       element: attacher.outgoing[0],
    //       scope: scope.parent
    //     });
    //   }
    //   return true;
    // } else 
    if (this._evaluateCondition(attacher, attacher.businessObject.eventDefinitions[0].condition.body)) {
      this._simulator.enter({
        element: attacher.outgoing[0],
        scope: scope.parent
      });
      return true;
    }
  });
  return false;
};

ActivityBehavior.prototype._findBoundaryEvent = function (element) {
  return element.attachers.find(attacher =>
    attacher.businessObject.$type === 'bpmn:BoundaryEvent' &&
    attacher.businessObject.eventDefinitions[0].$type === 'bpmn:ConditionalEventDefinition' &&
    attacher.host.businessObject.$type === 'bpmn:Task'
  );
};

ActivityBehavior.prototype.processAssignments = function (context) {
  const { element } = context;
  if (element.type === 'bpmn:Task' && element.businessObject.assignment) {
    const parentId = element.businessObject.$parent.id

    let assignment = element.businessObject.assignment.split(', ');
    for (let index = 0; index < assignment.length; index++) {
      if (assignment[index].includes('.') && assignment[index].includes('$')) {
        let key = assignment[index].split('.')[0].substring(1)
        if (this._simulator._processStateMap.get(parentId + '.' + key)) {
          assignment[index] = this._simulator._processStateMap.get(parentId + '.' + key) + '.' + assignment[index].split('.')[1]
        }
      }
    }
    element.businessObject.assignment = assignment.join(', ');

    const assignmentObj = AssignmentUtil.parseActivityAssignment(element.businessObject);

    if (assignmentObj[parentId] && assignmentObj[parentId]['connect']) {
      assignmentObj[parentId]['connect'].split(',').forEach(placeName => {
        this.addPlacesAndTransition(placeName.split('.'));
      });
    }

    if (assignmentObj[parentId] && assignmentObj[parentId]['disconnect']) {
      assignmentObj[parentId]['disconnect'].split(',').forEach(placeName => {
        let connectionToDelete = AssignmentUtil.findTransitionByName(placeName, this._spaceModeler);
        if (connectionToDelete) {
          const canvas = this._spaceModeler._canvaspace.canvas;
          canvas.removeConnection(connectionToDelete);
          canvas._elementRegistry.remove(connectionToDelete);
        }
      })
    }

    Object.keys(assignmentObj).forEach(objKey => {
      Object.keys(assignmentObj[objKey]).forEach(key => {
        let newValue = assignmentObj[objKey][key];
        if (newValue.includes('PLACES')) {
          let macro = newValue.split(' ');
          let attribute = macro[0].split('.')[1]
          let condition = macro[1]
          if (condition == 'is')
            condition = '=='
          else if (condition == 'not')
            condition = '!='
          else if (condition == 'gt')
            condition = '>'
          else if (condition == 'ls')
            condition = '<'
          else if (condition == 'gte')
            condition = '>='
          else if (condition == 'lse')
            condition = '<='
          let attrValue = macro[2]
          for (let [key, value] of this._simulator._processStateMap.entries()) {
            if (key.startsWith('Place_') && key.endsWith(attribute) && eval(value + condition + attrValue))
              newValue = key.substring(6).split('.')[0]
          }
        }
        console.log('Setting value:', objKey + '.' + key, newValue);
        this._simulator._processStateMap.set(objKey + '.' + key, newValue);
        this._checkConditionalStartEvents();
        const mapArray = Array.from(this._simulator._processStateMap.entries());
        const mapJson = JSON.stringify(mapArray);
        localStorage.setItem('processStateMap', mapJson);
        document.dispatchEvent(new CustomEvent('processStateMapUpdate'));
      });
    });
  }
};

ActivityBehavior.prototype._checkConditionalStartEvents = function () {
  const allElements = this._elementRegistry.getAll();
  allElements.forEach(element => {
    if (is(element, 'bpmn:StartEvent') && element.businessObject.eventDefinitions && element.businessObject.eventDefinitions[0].$type === 'bpmn:ConditionalEventDefinition') {
      const parentElement = this._findParentElement(element);
      const parentScope = this._simulator.findScope({ element: parentElement });

      const eventContext = {
        element: element,
        scope: parentScope
      };
      const eventBehavior = this._eventBehaviors.get(element);
      if (eventBehavior)
        return eventBehavior.call(this, eventContext);
    }
  });
};

ActivityBehavior.prototype._findParentElement = function (element) {
  let currentElement = element;
  while (currentElement && !is(currentElement, 'bpmn:Process')) {
    currentElement = currentElement.parent;
  }
  return currentElement;
};

ActivityBehavior.prototype.addPlacesAndTransition = function (assignments) {
  const olcElementFactory = this._spaceModeler.get('olcElementFactory');
  const olcUpdater = this._spaceModeler.get('olcUpdater');
  const canvas = this._spaceModeler._canvaspace.canvas;

  if (assignments.length < 2 || !Array.isArray(assignments)) {
    console.error('Please provide an array with at least two place names in the add assignment.');
    return;
  }

  let previousPlace = null;
  const rootElement = canvas.getRootElement();

  assignments.forEach((placeName, index) => {
    let place = AssignmentUtil.findPlaceByName(placeName, this._spaceModeler);

    if (!place) {
      const placeBusinessObject = olcElementFactory.createBusinessObject('space:Place', { 'name': placeName });

      place = olcElementFactory.createShape({
        type: 'space:Place',
        businessObject: placeBusinessObject,
        id: placeBusinessObject.id,
        x: 100 + index * 200,
        y: 100,
      });

      console.log('Creating place:', place);
      canvas.addShape(place, rootElement);

      // Link place to its parent business object
      olcUpdater.linkToBusinessObjectParent(place);
      console.log('Place added to canvas:', place);
    } else {
      console.log(`Place ${placeName} already exists:`, place);
    }

    if (previousPlace) {
      const connectionBusinessObject = olcElementFactory.createBusinessObject('space:Transition', { name: '1' });
      const connection = olcElementFactory.createConnection({
        type: 'space:Transition',
        businessObject: connectionBusinessObject,
        id: connectionBusinessObject.id,
        source: previousPlace,
        target: place,
        waypoints: olcUpdater.connectionWaypoints(previousPlace, place)
      });
      this._spaceModeler._canvaspace.canvas.addConnection(connection);

      connection.businessObject.sourcePlace = previousPlace.businessObject;
      connection.businessObject.targetPlace = place.businessObject;
      olcUpdater.linkToBusinessObjectParent(connection);
    }

    previousPlace = place;
  });
};



ActivityBehavior.prototype.signal = function (context) {
  console.log('Activity context signal:', context);
  const { element } = context;

  const eventBehavior = this._eventBehaviors.get(element);
  if (eventBehavior) {
    return eventBehavior.call(this, context);
  }
  const event = this._triggerMessages(context);
  if (event) {
    return this.signalOnEvent(context, event);
  }
  this._simulator.exit(context);
};



ActivityBehavior.prototype._processDestination = function (context, element, activatedFlows, parentScope, scope) {
  const flows = this.getSpaceWeighedPath(context);
  let destination = context.element.businessObject.destination
  let timespace = this.getSpaceExecutionTime(context);
  if (!element.businessObject.duration) {
    element.businessObject.duration = 0;
  }

  this._time.addTime(element.businessObject.duration);
  this._time.addTime(timespace);
  const timex = Object.values(this._time);

  element.businessObject.$parent.executionTime = timex[0];

  const elements = this._spaceModeler._canvaspace.canvas._elementRegistry._elements;


  if (flows.length === 0) {
    return false
  } else if (flows.length === 1) {
    // this._handleConnections([flows[0]], activatedFlows, parentScope, destination);
    if (this._handleConnections([flows[0]], activatedFlows, parentScope, destination))
      return true
    else {
      return false
    }
  } else {
    if (this._handleConnections([flows[0]], activatedFlows, parentScope, destination))
      setTimeout(() => this._processDestination(context, element, activatedFlows, parentScope, scope), 1200);
    else {
      let boundary = false
      element.attachers.forEach(attacher => {
        if ((attacher.businessObject.eventDefinitions[0].condition.body == 'UNREACHABLE')) {
          if (flows.some(flow => !elements.hasOwnProperty(flow.id))) {
            boundary = true
            this._simulator.enter({
              element: attacher.outgoing[0],
              scope: scope.parent
            });
          }
        }
      })

      if (!boundary) {
        const modeling = this._spaceModeler.get('modeling');
        modeling.setColor([element], {
          stroke: 'red',
          fill: '#ffa5a5'
        });
        this._eventBus.fire(NOT_REACHABLE_EVENT, { element: element });
        setTimeout(function () {
          modeling.setColor([element], {
            stroke: 'black',
            fill: 'white'
          });
        }, 3000);
        this._simulator.exit(context);
        return false
      }
    }
  }
};

ActivityBehavior.prototype._hexToRgb = function (hex) {
  // Remove the hash at the start if it's there
  hex = hex.replace(/^#/, '');

  // Parse the r, g, b values
  let bigint;
  let r, g, b;

  bigint = parseInt(hex, 16);
  r = (bigint >> 16) & 255;
  g = (bigint >> 8) & 255;
  b = bigint & 255;

  return `rgb(${r}, ${g}, ${b})`;
}

ActivityBehavior.prototype._resetPlaceCircles = function () {
  const elements = this._spaceModeler._canvaspace.canvas._elementRegistry._elements;
  for (let key in elements) {
    if (key.startsWith('Place_')) {
      let htmlString = elements[key].gfx.innerHTML
      let tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlString;
      let elementss = tempDiv.querySelectorAll('circle.participant-circle');
      elementss.forEach(element => {
        element.parentNode.removeChild(element)
      });
      elements[key].gfx.innerHTML = tempDiv.innerHTML;
    }
  }
}

ActivityBehavior.prototype._removeCircle = function (place, participant) {
  const elements = this._spaceModeler._canvaspace.canvas._elementRegistry._elements;
  if (elements.hasOwnProperty(place)) {
    let htmlString = elements[place].gfx.innerHTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const circles = doc.querySelectorAll(`circle.${participant}`);
    circles.forEach(circle => {
      circle.parentNode.removeChild(circle);
    });
    elements[place].gfx.innerHTML = new XMLSerializer().serializeToString(doc);
  }
}

ActivityBehavior.prototype._appendCircle = function (place, color, participant) {
  const elements = this._spaceModeler._canvaspace.canvas._elementRegistry._elements;
  if (elements.hasOwnProperty(place)) {
    let htmlString = elements[place].gfx.innerHTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const gElement = doc.querySelector('g.djs-visual');
    const alreadyExists = gElement.querySelector('circle.' + participant);
    if (!alreadyExists) {
      const existingCircles = gElement.querySelectorAll('circle.participant-circle');

      let cx = 10; // Initial x position
      if (existingCircles.length > 0) {
        const lastCircle = existingCircles[existingCircles.length - 1];
        const lastCircleCx = parseFloat(lastCircle.getAttribute('cx'));
        cx = lastCircleCx + 2 * 12 + 5; // Adjust spacing (5 is padding) as needed
      }

      const newCircle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
      newCircle.setAttribute('cx', cx.toString()); // Adjust as necessary for positioning
      newCircle.setAttribute('cy', '90'); // Adjust as necessary for positioning
      newCircle.setAttribute('r', '12');
      newCircle.setAttribute('style', `fill: ${color};`);
      newCircle.classList.add('participant-circle')
      newCircle.classList.add(participant)

      gElement.appendChild(newCircle);
      elements[place].gfx.innerHTML = new XMLSerializer().serializeToString(doc);
    }
  }
}

ActivityBehavior.prototype.exit = async function (context) {
  const { element, scope, isBoundaryEvent } = context;  // Aggiungi isBoundaryEvent al contesto
  const parentScope = scope.parent;
  const complete = !scope.failed;

  this.tokenColor = context.initiator.colors.primary
  let place = this._simulator._processStateMap.get(element.parent.businessObject.id + '.position');
  if (place === undefined)
    place = element.parent.businessObject.root;
  this._appendCircle(place, this.tokenColor, parentScope.element.id);

  if (complete && !isEventSubProcess(element)) {
    this._transactionBehavior.registerCompensation(scope);
  }

  const activatedFlows = complete ? element.outgoing.filter(isSequenceFlow) : [];

  if (isBoundaryEvent) {
    console.log('Handling exit for boundary event:', element);
    // Gestione dell'uscita per boundary event
    this._handleBoundaryEventExit(context, element, activatedFlows, parentScope, scope);
  } else {
    // Gestione dell'uscita per attività normale
    await this._handleDestination(context, element, activatedFlows, parentScope, scope);

    if (!element.businessObject.destination || element.businessObject.destination === "") {
      this._addExecutionTime(element);
      this._activateFlows(activatedFlows, parentScope, scope);
    }
  }
};

ActivityBehavior.prototype._handleBoundaryEventExit = function (context, element, activatedFlows, parentScope, scope) {
  if (activatedFlows.length === 0) {
    this._scopeBehavior.tryExit(parentScope, scope);
    return;
  }

  activatedFlows.forEach(flowElement => this._simulator.enter({
    element: flowElement,
    scope: parentScope
  }));
};


ActivityBehavior.prototype._handleDestination = async function (context, element, activatedFlows, parentScope, scope) {
  if (element.businessObject.destination) {
    if (element.parent.businessObject.root) {
      let ok = this._processDestination(context, element, activatedFlows, parentScope, scope)
      if (!ok && ok !== undefined) {
        let boundary = false
        element.attachers.forEach(attacher => {
          if ((attacher.businessObject.eventDefinitions[0].condition.body == 'UNREACHABLE')) {
            boundary = true
            this._simulator.enter({
              element: attacher.outgoing[0],
              scope: scope.parent
            });
          }
        })

        if (!boundary) {
          const modeling = this._spaceModeler.get('modeling');
          modeling.setColor([element], {
            stroke: 'red',
            fill: '#ffa5a5'
          });
          this._eventBus.fire(NOT_REACHABLE_EVENT, { element: element });
          setTimeout(function () {
            modeling.setColor([element], {
              stroke: 'black',
              fill: 'white'
            });
          }, 3000);
          this._simulator.exit(context);
        }
      }
    } else {
      const modeling = this._spaceModeler.get('modeling');
      modeling.setColor([element.parent], {
        stroke: 'red',
        fill: '#ffa5a5'
      });
      this._eventBus.fire(NO_ROOT_EVENT, { element: element.parent });
      setTimeout(function () {
        modeling.setColor([element.parent], {
          stroke: 'black',
          fill: 'white'
        });
      }, 3000);
      this._simulator.exit(context);
    }
  }
};


ActivityBehavior.prototype._activateFlows = function (activatedFlows, parentScope, scope) {
  if (activatedFlows.length === 0) {
    // Se non ci sono flussi attivati, esci dal contesto corrente
    this._scopeBehavior.tryExit(parentScope, scope);
    return;
  }

  // Altrimenti, continua con i flussi attivati
  activatedFlows.forEach(flowElement => this._simulator.enter({
    element: flowElement,
    scope: parentScope
  }));
};

ActivityBehavior.prototype._handleConnections = function (flows, activatedFlows, parentScope, destination) {
  const connections = flows.map(flow => {
    const element = this._spaceModeler._canvaspace.canvas._elementRegistry._elements[flow.id];
    if (!element || !element.element) {
      return null;
    } else {
      return element.element;
    }
  });

  if (!(connections[0] && connections[0].businessObject)) {
    return false
    // const modeling = this._spaceModeler.get('modeling');
    // modeling.setColor([element.parent], {
    //   stroke: 'red',
    //   fill: '#ffa5a5'
    // });
    // this._eventBus.fire(NOT_REACHABLE_EVENT, { element: element.parent });
    // setTimeout(function () {
    //   modeling.setColor([element.parent], {
    //     stroke: 'black',
    //     fill: 'white'
    //   });
    // }, 1000);
    // this._simulator.exit(context);
  } else if (connections.length > 0) {
    const element = connections.shift();
    element['connections'] = connections;
    element['activatedFlows'] = activatedFlows;
    this._simulator._processStateMap.set(activatedFlows[0].parent.id + '.position', element.businessObject.targetPlace.id);
    const mapArray = Array.from(this._simulator._processStateMap.entries());
    const mapJson = JSON.stringify(mapArray);
    localStorage.setItem('processStateMap', mapJson);
    document.dispatchEvent(new CustomEvent('processStateMapUpdate'));

    this._simulator.enter({
      element,
      scope: parentScope,
      parentScope: parentScope,
      destination: destination
    });

    return true;
  }
};


ActivityBehavior.prototype._addExecutionTime = function (element) {
  if (!element.businessObject.duration) {
    element.businessObject.duration = 0;
  }
  this._time.addTime(element.businessObject.duration);
  const timex = Object.values(this._time);
  element.businessObject.$parent.executionTime = timex[0];
};

ActivityBehavior.prototype.getSpaceExecutionTime = function (context) {
  const { element } = context;
  const flows = this.getSpaceWeighedPath(context);
  const totalDistance = flows.reduce((sum, flow) => sum + parseInt(flow.name), 0);
  const velocity = element.businessObject.velocity || 1;
  return totalDistance / velocity;
};

ActivityBehavior.prototype.signalOnEvent = function (context, event) {
  const { scope, element } = context;
  const subscription = this._simulator.subscribe(scope, event, initiator => {
    subscription.remove();
    return this._simulator.signal({
      scope,
      element,
      initiator,
    });
  });
};

ActivityBehavior.prototype.waitAtElement = function (element) {
  console.log(this._simulator.getConfig(element));
  const wait = this._simulator.getConfig(element).wait;
  return {
    element,
    type: 'continue',
    interrupting: false,
    boundary: false
  };
};

ActivityBehavior.prototype._getMessageContexts = function (element, after = null) {
  const filterAfter = after ? ctx => ctx.referencePoint.x > after.x : () => true;
  const sortByReference = (a, b) => a.referencePoint.x - b.referencePoint.x;

  return [
    ...element.incoming.filter(isMessageFlow).map(flow => ({
      incoming: flow,
      referencePoint: last(flow.waypoints)
    })),
    ...element.outgoing.filter(isMessageFlow).map(flow => ({
      outgoing: flow,
      referencePoint: first(flow.waypoints)
    }))
  ].sort(sortByReference).filter(filterAfter);
};

ActivityBehavior.prototype._triggerMessages = function (context) {
  const { element, initiator, scope } = context;

  let messageContexts = scope.messageContexts;

  if (!messageContexts) {
    messageContexts = scope.messageContexts = this._getMessageContexts(element);
  }

  const initiatingFlow = initiator && initiator.element;

  if (isMessageFlow(initiatingFlow)) {
    if (scope.expectedIncoming !== initiatingFlow) {
      console.debug('Simulator :: ActivityBehavior :: ignoring out-of-bounds message');
      return;
    }
  }

  while (messageContexts.length) {
    const { incoming, outgoing } = messageContexts.shift();

    if (incoming) {
      if (!initiator) {
        continue;
      }
      scope.expectedIncoming = incoming;
      return {
        element,
        type: 'message',
        name: incoming.id,
        interrupting: false,
        boundary: false
      };
    }

    this._simulator.signal({
      element: outgoing,
    });
  }
};


//Helpersss
function first(arr) {
  return arr && arr[0];
}

function last(arr) {
  return arr && arr[arr.length - 1];
}

function getNameRoot(rootId, places) {
  const rootPlace = places.find(place => place.id === rootId);
  return rootPlace ? rootPlace.name : 'Nome sconosciuto';
}

function getNameDestination(destinationId, places) {
  const destinationPlace = places.find(place => place.id === destinationId);
  return destinationPlace ? destinationPlace.name : 'Nome sconosciuto';
}