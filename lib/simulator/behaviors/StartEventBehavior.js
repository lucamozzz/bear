import { NO_ROOT_EVENT } from "../../util/EventHelper";

export default function StartEventBehavior(
  simulator,
  activityBehavior,
  eventBus
) {

  this._simulator = simulator;
  this._activityBehavior = activityBehavior;
  this._eventBus = eventBus;

  simulator.registerBehavior('bpmn:StartEvent', this);
  simulator.registerBehavior('space:Place', this);
}

StartEventBehavior.prototype.signal = function (context) {
  const { element } = context;

  if (element.parent.businessObject.root)
    this._renderParticipantPositon(
      {
        id: context.parentScope.element.businessObject.name,
        root: context.parentScope.element.businessObject.root,
        color: context.parentScope.colors.primary
      }
    )
  else
    this._renderParticipantPositon(
      {
        id: context.parentScope.element.businessObject.name,
        color: context.parentScope.colors.primary
      }
    )

  this._simulator.exit(context);
};

StartEventBehavior.prototype._renderParticipantPositon = function (participant) {
  document.dispatchEvent(new CustomEvent('process_start', { detail: { participant: participant } }));
}

StartEventBehavior.prototype.exit = function (context) {
  this._activityBehavior.exit(context);
};

StartEventBehavior.$inject = [
  'simulator',
  'activityBehavior',
  'eventBus'
];