export default function StartEventBehavior(
  simulator,
  activityBehavior,
) {

  this._simulator = simulator;
  this._activityBehavior = activityBehavior;

  simulator.registerBehavior('bpmn:StartEvent', this);
  simulator.registerBehavior('space:Place', this);
}

StartEventBehavior.prototype.signal = function (context) {
  const { element } = context;

  element.incoming.forEach(inc => {
    console.log(inc.source.type);
    if (inc.source.type == 'bpmn:IntermediateThrowEvent' || inc.source.type == 'bpmn:EndEvent') {
      let payload = this._evaluatePayload(inc.source.businessObject.payload, inc.source.businessObject.$parent.id);
      this._simulator._processStateMap.set(element.businessObject.$parent.id + '.' + element.businessObject.attribute, payload);
      const mapArray = Array.from(this._simulator._processStateMap.entries());
      const mapJson = JSON.stringify(mapArray);
      localStorage.setItem('processStateMap', mapJson);
      document.dispatchEvent(new CustomEvent('processStateMapUpdate'));
    }
  });

  this._simulator.exit(context);
};

StartEventBehavior.prototype._evaluatePayload = function (payload, parent) {
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
      console.log(parent + '.' + payload);
      if (this._simulator._processStateMap.get(parent + '.' + payload))
        payload = this._simulator._processStateMap.get(parent + '.' + payload);
    }
    return payload;
  }
}

StartEventBehavior.prototype.exit = function (context) {
  this._activityBehavior.exit(context);
};

StartEventBehavior.$inject = [
  'simulator',
  'activityBehavior'
];