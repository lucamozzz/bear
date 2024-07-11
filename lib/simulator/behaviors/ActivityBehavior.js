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
    this._resetCircles();
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

  if (element.type === 'bpmn:Task' && element.businessObject.destination)
    this._appendActivityCircle(element.businessObject.id, context.initiator.colors.primary);

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
    let boundary = this._handleBoundaryEvents(context)
    console.log('Boundary:', boundary);
    if (!boundary) {
      this.processAssignments(context);
      this._simulator.exit(context);
    }
  }
};

ActivityBehavior.prototype._evaluateCondition = function (element, condition) {
  if (condition !== undefined && condition !== "") {
    const operatorsRegex = /([=!]=|===|!==|<|>|<=|>=)/;
    const expressionElements = condition.split(operatorsRegex).map(str => str.trim()).filter(Boolean);

    if (expressionElements.length !== 3) {
      if (expressionElements[0] !== 'UNREACHABLE')
        console.error('Invalid condition expression:', condition);
      return false;
    }

    let [e1, operator, e2] = expressionElements;

    if (e1.includes('.') && e1.includes('$')) {
      let key = e1.split('.')[0].substring(1);
      if (this._simulator._processStateMap.has(element.businessObject.$parent.id + '.' + key)) {
        e1 = this._simulator._processStateMap.get(element.businessObject.$parent.id + '.' + key) + '.' + e1.split('.')[1];
      }
    }

    if (e1.includes('PLACES')) {
      let attribute = e1.split('.')[1];
      for (let [key, value] of this._simulator._processStateMap.entries()) {
        if (key.startsWith('Place_') && key.endsWith(attribute) && value === e2) {
          return true;
        }
      }
      return false;
    }

    if (!e1.includes('.')) {
      e1 = this._simulator._processStateMap.get(element.businessObject.$parent.id + '.' + e1);
    } else {
      e1 = this._simulator._processStateMap.get('Place_' + e1);
    }

    if (e1 === undefined || e1 === null) {
      console.error('Unable to resolve the first operand:', expressionElements[0]);
      return false;
    }

    let quotedE2 = isNaN(e2) ? `'${e2}'` : e2;
    let conditionFunction = new Function('e1', `return e1 ${operator} ${quotedE2};`);

    try {
      return conditionFunction(e1);
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }
  return false;
};

ActivityBehavior.prototype._handleBoundaryEvents = function (context) {
  const { element, scope } = context;
  element.attachers.forEach(attacher => {
    console.log(this._evaluateCondition(attacher, attacher.businessObject.eventDefinitions[0].condition.body))
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
          let attribute = macro[0].split('.')[1];
          let condition = macro[1];
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
          let attrValue = macro[2];

          for (let [key, value] of this._simulator._processStateMap.entries()) {
            let quotedAttrValue = isNaN(attrValue) ? `'${attrValue}'` : attrValue;
            let conditionFunction = new Function('value', `return value ${condition} ${quotedAttrValue};`);

            if (key.startsWith('Place_') && key.endsWith(attribute) && conditionFunction(value)) {
              newValue = key.substring(6).split('.')[0];
            }
          }
        }

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

ActivityBehavior.prototype._resetCircles = function () {
  const elements = this._spaceModeler._canvaspace.canvas._elementRegistry._elements;
  for (let key in elements) {
    if (key.startsWith('Place_')) {
      let htmlString = elements[key].gfx.innerHTML
      let tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlString;
      let placeCircles = tempDiv.querySelectorAll('circle.participant-circle');
      placeCircles.forEach(element => {
        element.parentNode.removeChild(element)
      });
      let activityCircles = tempDiv.querySelectorAll('circle.activity-circle');
      activityCircles.forEach(element => {
        element.parentNode.removeChild(element)
      });
      elements[key].gfx.innerHTML = tempDiv.innerHTML;
    }
  }
}

ActivityBehavior.prototype._appendActivityCircle = function (activity, color) {
  const elements = this._elementRegistry._elements;
  if (elements.hasOwnProperty(activity)) {
    let htmlString = elements[activity].gfx.innerHTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const gElement = doc.querySelector('g.djs-visual');
    const newCircle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
    newCircle.setAttribute('cx', '0'); // Adjust as necessary for positioning
    newCircle.setAttribute('cy', '80'); // Adjust as necessary for positioning
    newCircle.setAttribute('r', '10');
    newCircle.setAttribute('style', `fill: ${color};`);
    newCircle.classList.add('activity-circle')
    newCircle.classList.add(activity)

    gElement.appendChild(newCircle);
    elements[activity].gfx.innerHTML = new XMLSerializer().serializeToString(doc);
  }
}

ActivityBehavior.prototype._removeActivityCircle = function (activity) {
  const elements = this._elementRegistry._elements;
  if (elements.hasOwnProperty(activity)) {
    let htmlString = elements[activity].gfx.innerHTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const circles = doc.querySelectorAll(`circle.${activity}`);
    circles.forEach(circle => {
      circle.parentNode.removeChild(circle);
    });
    elements[activity].gfx.innerHTML = new XMLSerializer().serializeToString(doc);
  }
}

ActivityBehavior.prototype._appendPlaceCircle = function (place, color, participant) {
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
  this._appendPlaceCircle(place, this.tokenColor, parentScope.element.id);

  if (complete && !isEventSubProcess(element)) {
    this._transactionBehavior.registerCompensation(scope);
  }

  const activatedFlows = complete ? element.outgoing.filter(isSequenceFlow) : [];

  if (isBoundaryEvent) {
    this._handleBoundaryEventExit(context, element, activatedFlows, parentScope, scope);
  } else {
    if (element.businessObject.destination) {
      if (element.parent.businessObject.root) {
        if (!this._simulator._processStateMap.get(element.parent.businessObject.id + '.position')) {
          this._simulator._processStateMap.set(element.parent.businessObject.id + '.position', element.parent.businessObject.root);
        }
        await this._moveToDestination(this._simulator._processStateMap.get(element.parent.businessObject.id + '.position'), element.businessObject.destination, context, element, activatedFlows, parentScope, scope)
      } else {
        const modeling = this._spaceModeler.get('modeling');
        modeling.setColor([element], {
          stroke: 'red',
          fill: '#ffa5a5'
        });
        this._eventBus.fire(NO_ROOT_EVENT, { element: element });
        setTimeout(function () {
          modeling.setColor([element], {
            stroke: 'black',
            fill: 'white'
          });
        }, 3000);
        this._simulator.exit(context);
      }
    }

    if (!element.businessObject.destination || element.businessObject.destination === "") {
      this._addExecutionTime(element);
      this._activateFlows(activatedFlows, parentScope, scope);
    }
  }
};

ActivityBehavior.prototype._moveToDestination = async function (root, destination, context, element, activatedFlows, parentScope, scope) {
  const spaceElements = this._spaceModeler._canvaspace.canvas._elementRegistry._elements;
  const spaceElementsArray = [];

  for (const key in spaceElements) {
    if (spaceElements.hasOwnProperty(key) && key !== 'Space_Diagram')
      spaceElementsArray.push(spaceElements[key].element.businessObject);
  }

  const places = spaceElementsArray.filter(e => is(e, 'space:Place'));
  const connections = spaceElementsArray.filter(e => is(e, 'space:Transition'));

  const g = new WeightedGraph();
  places.forEach(p => g.addVertex(p.id));
  connections.forEach(conn => {
    const weight = parseInt(conn.name);
    if (!isNaN(weight)) {
      g.addEdge(conn.sourcePlace.id, conn.targetPlace.id, weight);
    } else {
      g.addEdge(conn.sourcePlace.id, conn.targetPlace.id, 1);
    }
  });

  const shortestPath = g.Dijkstra(root, destination);
  const pathConnections = shortestPath.slice(1).map((id, index) => {
    const connection = connections.find(c => c.sourcePlace.id === shortestPath[index] && c.targetPlace.id === id);
    if (!connection)
      return null;
    return connection;
  }).filter(Boolean);

  let currentPosition = this._simulator._processStateMap.get(element.parent.businessObject.id + '.position')

  if (pathConnections.length === 0) {
    let boundary = false
    element.attachers.forEach(attacher => {
      if ((attacher.businessObject.eventDefinitions[0].condition.body == 'UNREACHABLE')) {
        boundary = true
        this._appendPlaceCircle(currentPosition, context.initiator.colors.primary, parentScope.element.id);
        this._removeActivityCircle(element.businessObject.id)
        this._simulator.enter({
          element: attacher.outgoing[0],
          scope: scope.parent
        });
      }
    })

    if (!boundary) {
      const modeling = this._spaceModeler.get('modeling');
      modeling.setColor([{ element: element }], {
        stroke: 'red',
        fill: '#ffa5a5'
      });
      this._eventBus.fire(NOT_REACHABLE_EVENT, { element: element });
      setTimeout(function () {
        modeling.setColor([{ element: element }], {
          stroke: 'black',
          fill: 'white'
        });
      }, 3000);
      this._appendPlaceCircle(currentPosition, context.initiator.colors.primary, parentScope.element.id);
      this._simulator.exit(context);
    }
  } else {
    this._moveSpatialToken([pathConnections[0]], activatedFlows, parentScope, destination)
    if (pathConnections.length === 1)
      setTimeout(() => this._removeActivityCircle(element.businessObject.id), 1200);

    currentPosition = this._simulator._processStateMap.get(element.parent.businessObject.id + '.position')
    if (currentPosition !== destination)
      setTimeout(() => this._moveToDestination(currentPosition, destination, context, element, activatedFlows, parentScope, scope), 1200);
  }
}

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

ActivityBehavior.prototype._moveSpatialToken = function (flows, activatedFlows, parentScope, destination) {
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