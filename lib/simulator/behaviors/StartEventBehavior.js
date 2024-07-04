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
    if (inc.source.type == 'bpmn:IntermediateThrowEvent') {
      this._simulator._processStateMap.set(element.businessObject.$parent.id + '.' + element.businessObject.attribute, inc.source.businessObject.payload);
      const mapArray = Array.from(this._simulator._processStateMap.entries());
      const mapJson = JSON.stringify(mapArray);
      localStorage.setItem('processStateMap', mapJson);
      document.dispatchEvent(new CustomEvent('processStateMapUpdate'));
    }
  });

  this._simulator.exit(context);
};

StartEventBehavior.prototype.exit = function (context) {
  this._activityBehavior.exit(context);
};

StartEventBehavior.$inject = [
  'simulator',
  'activityBehavior'
];