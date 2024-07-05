// File path: /mnt/data/EventBehaviors.js

import {
  getEventDefinition,
  isTypedEvent
} from '../../util/ElementHelper';

import {
  ScopeTraits
} from '../ScopeTraits';

import {
  isEventSubProcess,
  isLinkCatch
} from '../util/ModelUtil';
import { is } from "bpmn-js/lib/util/ModelUtil";

export default function EventBehaviors(
  simulator,
  elementRegistry,
  scopeBehavior,
  activityBehavior,
  processBehavior
) {
  this._simulator = simulator;
  this._elementRegistry = elementRegistry;
  this._scopeBehavior = scopeBehavior;
  this._activityBehavior = activityBehavior;
  this._processBehavior = processBehavior;
}

EventBehaviors.$inject = [
  'simulator',
  'elementRegistry',
  'scopeBehavior',
  'activityBehavior',
  'processBehavior'
];


EventBehaviors.prototype.handleConditionalEvent = function (context) {
  const { element } = context;
  const condition = element.businessObject.eventDefinitions[0].condition.body;
  if (this._evaluateCondition(element, condition)) {
    // this._activityBehavior.exit({
    //   element: element,
    //   scope: scope,
    //   isBoundaryEvent: true
    // });
    element.businessObject.eventDefinitions[0].hasBeenTriggered = true;
  }
};

EventBehaviors.prototype.handleStartEventConditional = function (context) {
  const { element, scope } = context;
  if (element.businessObject.eventDefinitions[0].hasBeenTriggered)
    return;
  const condition = element.businessObject.eventDefinitions[0].condition.body;
  if (this._evaluateCondition(element, condition)) {
    this._simulator.signal({
      element: element,
      parentScope: scope
    });
    element.businessObject.eventDefinitions[0].hasBeenTriggered = true;
  }
};

EventBehaviors.prototype._evaluateCondition = function (element, condition) {
  if ((condition !== undefined) && (condition !== "")) {
    const operatorsRegex = new RegExp(`(${["==", "===", "!=", "!==", "<", ">", "<=", ">="].map(op => op.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`);
    const expressionElements = condition.split(operatorsRegex).map(str => str.trim()).filter(Boolean);
    let e1 = expressionElements[0];
    let e2 = expressionElements[2];

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
    return eval(e1 + expressionElements[1] + e2);
  }
}

EventBehaviors.prototype.get = function (element) {
  const behaviors = {
    'bpmn:ConditionalEventDefinition': (context) => {
      if (is(element, 'bpmn:StartEvent')) {
        return this.handleStartEventConditional(context);
      } else {
        return this.handleConditionalEvent(context);
      }
    },
    'bpmn:LinkEventDefinition': (context) => {
      const { element, scope } = context;
      const link = getLinkDefinition(element);
      const parentScope = scope.parent;
      const parentElement = parentScope.element;

      const linkTargets = parentElement.children.filter(element =>
        isLinkCatch(element) &&
        getLinkDefinition(element).name === link.name
      );

      for (const linkTarget of linkTargets) {
        this._simulator.signal({
          element: linkTarget,
          parentScope,
          initiator: scope
        });
      }
    },
    'bpmn:SignalEventDefinition': (context) => {
      const { element, scope } = context;
      const subscriptions = this._simulator.findSubscriptions({ event: element });
      const signaledScopes = new Set();

      for (const subscription of subscriptions) {
        const signaledScope = subscription.scope;

        if (signaledScopes.has(signaledScope)) {
          continue;
        }

        signaledScopes.add(signaledScope);

        this._simulator.trigger({
          event: element,
          scope: signaledScope,
          initiator: scope
        });
      }
    },
    'bpmn:EscalationEventDefinition': (context) => {
      const { element, scope } = context;
      const scopes = this._simulator.findScopes({
        subscribedTo: { event: element },
        trait: ScopeTraits.ACTIVE
      });

      let triggerScope = scope;

      while ((triggerScope = triggerScope.parent)) {
        if (scopes.includes(triggerScope)) {
          this._simulator.trigger({
            event: element,
            scope: triggerScope,
            initiator: scope
          });
          break;
        }
      }
    },
    'bpmn:ErrorEventDefinition': (context) => {
      const { element, scope } = context;
      this._simulator.trigger({
        event: element,
        initiator: scope,
        scope: findSubscriptionScope(scope)
      });
    },
    'bpmn:TerminateEventDefinition': (context) => {
      const { scope } = context;
      this._scopeBehavior.terminate(scope.parent, scope);
    },
    'bpmn:CancelEventDefinition': (context) => {
      const { scope, element } = context;
      this._simulator.trigger({
        event: element,
        initiator: scope,
        scope: findSubscriptionScope(scope)
      });
    },
    'bpmn:CompensateEventDefinition': (context) => {
      const { scope, element } = context;
      return this._simulator.waitForScopes(
        scope,
        this._simulator.trigger({
          event: element,
          scope: findSubscriptionScope(scope)
        })
      );
    }
  };

  const entry = Object.entries(behaviors).find(
    entry => isTypedEvent(element, entry[0])
  );

  return entry && entry[1];
};

// helpers
function getLinkDefinition(element) {
  return getEventDefinition(element, 'bpmn:LinkEventDefinition');
}

function findSubscriptionScope(scope) {
  while (isEventSubProcess(scope.parent.element)) {
    scope = scope.parent;
  }
  return scope.parent;
}
