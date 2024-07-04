import { SYNTAX_VIOLATION_EVENT } from "../../util/EventHelper";
import {
  filterSequenceFlows
} from '../util/ModelUtil';


export default function ExclusiveGatewayBehavior(simulator, spaceModeler, eventBus) {
  this._simulator = simulator;
  this._spaceModeler = spaceModeler;
  this._eventBus = eventBus;

  simulator.registerBehavior('bpmn:ExclusiveGateway', this);
}

ExclusiveGatewayBehavior.prototype.enter = function (context) {
  this._simulator.exit(context);
};

ExclusiveGatewayBehavior.prototype.exit = function (context) {

  const {
    element,
    scope
  } = context;

  // depends on UI to properly configure activeOutgoing for
  // each exclusive gateway

  const outgoings = filterSequenceFlows(element.outgoing);

  if (outgoings.length === 1) {
    return this._simulator.enter({
      element: outgoings[0],
      scope: scope.parent
    });
  }

  let activeOutgoing = undefined;
  outgoings.forEach(outgoing => {
    if ((outgoing.businessObject.guard !== undefined) && (outgoing.businessObject.guard !== "")) {
      const guardExpression = outgoing.businessObject.guard;
      const operatorsRegex = new RegExp(`(${["==", "===", "!=", "!==", "<", ">", "<=", ">="].map(op => op.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`);
      const expressionElements = guardExpression.split(operatorsRegex).map(str => str.trim()).filter(Boolean);
      let e1 = expressionElements[0];
      let e2 = expressionElements[2];

      if (expressionElements[0].includes('PLACES')) {
        let attribute = expressionElements[0].split('.')[1];
        for (let [key, value] of this._simulator._processStateMap.entries()) {
          if (key.startsWith('Place_') && key.endsWith(attribute) && value === e2)
            activeOutgoing = outgoing;
          console.log(activeOutgoing);
          continue;
        }
      } else {
        if (!expressionElements[0].includes('.'))
          e1 = this._simulator._processStateMap.get(element.businessObject.$parent.id + '.' + expressionElements[0]);
        else e1 = this._simulator._processStateMap.get(expressionElements[0]);

        if (eval(e1 + expressionElements[1] + e2))
          activeOutgoing = outgoing;
      }
    }
  })

  let outgoing = outgoings.find(o => o === activeOutgoing);

  if (!outgoing) {
    if (scope.element.businessObject.default) {
      outgoing = outgoings.find(o => o.id === scope.element.businessObject.default.id);
    } else {
      const modeling = this._spaceModeler.get('modeling');
      modeling.setColor([element], {
        stroke: 'red',
        fill: '#ffa5a5'
      });
      this._eventBus.fire(SYNTAX_VIOLATION_EVENT, { element: element });
      setTimeout(function () {
        modeling.setColor([element], {
          stroke: 'black',
          fill: 'white'
        });
      }, 3000);
    }
  }

  return this._simulator.enter({
    element: outgoing,
    scope: scope.parent
  });
};

ExclusiveGatewayBehavior.$inject = ['simulator', 'spaceModeler', 'eventBus'];