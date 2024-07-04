export default function IntermediateCatchEventBehavior(
  simulator,
  activityBehavior,
  elementRegistry,
) {

  this._activityBehavior = activityBehavior;
  this._simulator = simulator;
  this._elementRegistry = elementRegistry;

  simulator.registerBehavior('bpmn:IntermediateCatchEvent', this);
  simulator.registerBehavior('bpmn:ReceiveTask', this);
  // simulator.registerBehavior('space:Transition', this);

}

IntermediateCatchEventBehavior.$inject = [
  'simulator',
  'activityBehavior',
  'elementRegistry'
];

IntermediateCatchEventBehavior.prototype.signal = function (context) {
  const {
    element
  } = context;

  element.incoming.forEach(inc => {
    if (inc.source.type == 'bpmn:IntermediateThrowEvent') {
      this._simulator._processStateMap.set(element.businessObject.$parent.id + '.' + element.businessObject.attribute, inc.source.businessObject.payload);
      const mapArray = Array.from(this._simulator._processStateMap.entries());
      const mapJson = JSON.stringify(mapArray);
      localStorage.setItem('processStateMap', mapJson);
      document.dispatchEvent(new CustomEvent('processStateMapUpdate'));
    }
  });

  return this._simulator.exit(context);
};

IntermediateCatchEventBehavior.prototype.enter = function (context) {
  const {
    element
  } = context;

  // adapt special wait semantics; user must manually
  // trigger to indicate message received
  return this._activityBehavior.signalOnEvent(context, element);
};

IntermediateCatchEventBehavior.prototype.exit = function (context) {
  this._activityBehavior.exit(context);
};