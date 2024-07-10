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
  const operatorsRegex = /([=!]==?|!=|<|>|<=|>=)/;

  outgoings.forEach(outgoing => {
    if (outgoing.businessObject.guard !== undefined && outgoing.businessObject.guard !== "") {
      const guardExpression = outgoing.businessObject.guard;
      const expressionElements = guardExpression.split(operatorsRegex).map(str => str.trim()).filter(Boolean);

      if (expressionElements.length !== 3) {
        console.error('Invalid guard expression:', guardExpression);
        return;
      }

      let [e1, operator, e2] = expressionElements;

      // Resolve e1
      if (e1.includes('.') && e1.includes('$')) {
        let key = e1.split('.')[0].substring(1);
        if (this._simulator._processStateMap.get(element.businessObject.$parent.id + '.' + key)) {
          e1 = this._simulator._processStateMap.get(element.businessObject.$parent.id + '.' + key) + '.' + e1.split('.')[1];
        }
      }

      if (e1.includes('PLACES')) {
        let attribute = e1.split('.')[1];
        for (let [key, value] of this._simulator._processStateMap.entries()) {
          if (key.startsWith('Place_') && key.endsWith(attribute) && value == e2) {
            activeOutgoing = outgoing;
            break;
          }
        }
      } else {
        if (!e1.includes('.')) {
          e1 = this._simulator._processStateMap.get(element.businessObject.$parent.id + '.' + e1);
        } else {
          e1 = this._simulator._processStateMap.get('Place_' + e1);
        }

        // Construct the condition function
        let quotedE2 = isNaN(e2) ? `'${e2}'` : e2;
        let conditionFunction = new Function('e1', `return e1 ${operator} ${quotedE2};`);

        if (conditionFunction(e1)) {
          activeOutgoing = outgoing;
        }
      }
    }
  });

  // outgoings.forEach(outgoing => {
  //   if ((outgoing.businessObject.guard !== undefined) && (outgoing.businessObject.guard !== "")) {
  //     const guardExpression = outgoing.businessObject.guard;
  //     const operatorsRegex = new RegExp(`(${["==", "===", "!=", "!==", "<", ">", "<=", ">="].map(op => op.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`);
  //     const expressionElements = guardExpression.split(operatorsRegex).map(str => str.trim()).filter(Boolean);
  //     let e1 = expressionElements[0];
  //     let e2 = expressionElements[2];

  //     if (expressionElements[0].includes('.') && expressionElements[0].includes('$')) {
  //       let key = expressionElements[0].split('.')[0].substring(1)
  //       if (this._simulator._processStateMap.get(element.businessObject.$parent.id + '.' + key)) {
  //         expressionElements[0] = this._simulator._processStateMap.get(element.businessObject.$parent.id + '.' + key) + '.' + expressionElements[0].split('.')[1]
  //       }
  //     }


  //     if (expressionElements[0].includes('PLACES')) {
  //       let attribute = expressionElements[0].split('.')[1];
  //       for (let [key, value] of this._simulator._processStateMap.entries()) {
  //         if (key.startsWith('Place_') && key.endsWith(attribute) && value === e2)
  //           activeOutgoing = outgoing;
  //         continue;
  //       }
  //     } else {
  //       if (!expressionElements[0].includes('.'))
  //         e1 = this._simulator._processStateMap.get(element.businessObject.$parent.id + '.' + expressionElements[0]);
  //       else e1 = this._simulator._processStateMap.get('Place_' + expressionElements[0]);

  //       if (eval(e1 + expressionElements[1] + e2))
  //         activeOutgoing = outgoing;
  //     }
  //   }
  // })

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