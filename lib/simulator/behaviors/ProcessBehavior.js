import { is } from "../../../example/lib/util/Util";
import AssignmentUtil from "../util/AssignmentUtil";

export default function ProcessBehavior(
  simulator,
  scopeBehavior,
  elementRegistry,
  spaceModeler
) {
  this._simulator = simulator;
  this._simulator._processStateMap = new Map();
  this._scopeBehavior = scopeBehavior;
  this._elementRegistry = elementRegistry;
  this._spaceModeler = spaceModeler;

  simulator.registerBehavior('bpmn:Process', this);
  simulator.registerBehavior('bpmn:Participant', this);
}

ProcessBehavior.prototype.signal = function (context) {
  const { startEvent, scope } = context;

  this._processDataObjectAssignments();
  this._processPlaceAssignments();

  if (!startEvent) {
    throw new Error('Missing <startEvent> in context: ' + JSON.stringify(context));
  }

  this._simulator.signal({
    element: startEvent,
    parentScope: scope,
  });
};

ProcessBehavior.prototype.exit = function (context) {
  const { scope, initiator } = context;

  // Ensure that all sub-scopes are destroyed
  this._scopeBehavior.destroyChildren(scope, initiator);
};

ProcessBehavior.prototype._processDataObjectAssignments = function () {
  const mapArray = Array.from(this._simulator._processStateMap.entries());
  const mapJson = JSON.stringify(mapArray);
  localStorage.setItem('processStateMap', mapJson);
  document.dispatchEvent(new CustomEvent('processStateMapUpdate'));
  
  let elements = this._elementRegistry._elements;
  for (let key in elements) {
    if (key.startsWith('DataObjectReference') && !key.endsWith('label')) {
      let dataObject = elements[key].element.businessObject;
      let assignments = AssignmentUtil.parseDataObjectAssignments(dataObject.assignment)
      Object.keys(assignments).forEach(key => {
        this._simulator._processStateMap.set(dataObject.$parent.id + '.' + key, assignments[key])
      })
      const mapArray = Array.from(this._simulator._processStateMap.entries());
      const mapJson = JSON.stringify(mapArray);
      localStorage.setItem('processStateMap', mapJson);
      document.dispatchEvent(new CustomEvent('processStateMapUpdate'));
    }
  }
};

ProcessBehavior.prototype._processPlaceAssignments = function () {
  const spaceElements = this._spaceModeler._places.Elements;
  const places = spaceElements.filter(element => is(element, 'space:Place'));
  places.map(place => {
    let assignments = AssignmentUtil.parseAssignmentOlc(place.assignmentOlc);
    Object.keys(assignments).forEach(key => {
      this._simulator._processStateMap.set('Place_' + place.name + '.' + key, assignments[key])
    })
  });
  const mapArray = Array.from(this._simulator._processStateMap.entries());
  const mapJson = JSON.stringify(mapArray);
  localStorage.setItem('processStateMap', mapJson);
  document.dispatchEvent(new CustomEvent('processStateMapUpdate'));
};

ProcessBehavior.$inject = [
  'simulator',
  'scopeBehavior',
  'elementRegistry',
  'spaceModeler',
];
