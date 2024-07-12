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
      let payload = this._evaluatePayload(inc.source.businessObject.payload, inc.source.businessObject.$parent.id);
      this._simulator._processStateMap.set(element.businessObject.$parent.id + '.' + element.businessObject.attribute, payload);
      const mapArray = Array.from(this._simulator._processStateMap.entries());
      const mapJson = JSON.stringify(mapArray);
      localStorage.setItem('processStateMap', mapJson);
      document.dispatchEvent(new CustomEvent('processStateMapUpdate'));
    }
  });

  return this._simulator.exit(context);
};

IntermediateCatchEventBehavior.prototype._evaluatePayload = function (payload, parent) {
  if (payload) {
    if (payload.includes('PLACES')) {
      let macro = payload.split(' ');
      let attribute = macro[0].split('.')[1]
      let attrValue = macro[2]
      for (let [key, value] of this._simulator._processStateMap.entries()) {
        if (key.startsWith('Place_') && key.endsWith(attribute) && eval(value + macro[1] + attrValue))
          payload = key.split('.')[0].split('_')[1];
      }
    } else {
      if (this._simulator._processStateMap.get(parent + '.' + payload))
        payload = this._simulator._processStateMap.get(parent + '.' + payload);
    }
    return payload;
  }
}

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