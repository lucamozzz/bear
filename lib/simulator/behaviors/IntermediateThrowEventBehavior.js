export default function IntermediateThrowEventBehavior(
  simulator,
  activityBehavior,
  eventBehaviors) {

  this._simulator = simulator;
  this._activityBehavior = activityBehavior;
  this._eventBehaviors = eventBehaviors;

  simulator.registerBehavior('bpmn:IntermediateThrowEvent', this);
  simulator.registerBehavior('bpmn:SendTask', this);
}

IntermediateThrowEventBehavior.prototype.enter = function (context) {
  const {
    element
  } = context;

  if (element.businessObject.payload) {
    let payload = element.businessObject.payload
    if (payload.includes('PLACES')) {
      let macro = payload.split(' ');
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
      console.log(attribute, condition, attrValue);
      for (let [key, value] of this._simulator._processStateMap.entries()) {
        if (key.startsWith('Place_') && key.endsWith(attribute) && eval(value + condition + attrValue))
          element.businessObject.payload = key.split('.')[0]
      }
    } else {
      if (!payload.includes('.'))
        payload = element.businessObject.$parent.id + '.' + payload;
      else payload = 'Place_' + payload;
      if (this._simulator._processStateMap.get(payload))
        element.businessObject.payload = this._simulator._processStateMap.get(payload);
    }
  }

  const eventBehavior = this._eventBehaviors.get(element);

  if (eventBehavior) {
    const event = eventBehavior(context);

    if (event) {
      return this._activityBehavior.signalOnEvent(context, event);
    }
  }

  this._activityBehavior.enter(context);
};

IntermediateThrowEventBehavior.prototype.signal = function (context) {
  this._activityBehavior.signal(context);
};

IntermediateThrowEventBehavior.prototype.exit = function (context) {
  this._activityBehavior.exit(context);
};

IntermediateThrowEventBehavior.$inject = [
  'simulator',
  'activityBehavior',
  'eventBehaviors'
];