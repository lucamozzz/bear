import spaceProps from '../parts/SpaceProps';
import timeProp from '../../../exectionTime/executionTimeProvider/parts/TimeProps'
import CommonEvents from "../../../../common/CommonEvents";
import { is } from 'bpmn-js/lib/util/ModelUtil';
import { ConditionProps } from "../parts/ConditionProps";
import { Group } from "@bpmn-io/properties-panel";

const LOW_PRIORITY = 500;

export default function SpacePropertiesProvider(propertiesPanel, translate, eventBus, spaceModeler) {

  // API
  this._eventBus = eventBus;
  this._spaceModeler = spaceModeler;
  const modeler = this._spaceModeler;

  this.getGroups = function (element) {
    return function (groups) {
      if (is(element, 'bpmn:Task')) {
        groups.push(createSpaceGroup(element, translate));
      }
      if (is(element, 'bpmn:DataObjectReference')) {
        groups.push(createSpaceGroup(element, translate));
      }
      if (is(element, 'bpmn:Participant')) {
        groups.push(createSpaceGroup(element, translate));
      }
      if (is(element, 'bpmn:StartEvent') || is(element, 'bpmn:BoundaryEvent')) {
        groups.push(createConditionGroup(element, translate));
      }
      if (is(element, 'bpmn:Process')) {
        groups.push(createTimeGroup(element, translate));
      }

      // Filter out null groups
      return groups.filter((group) => group !== null);
    };
  };
  propertiesPanel.registerProvider(LOW_PRIORITY, this);

  // Create the custom space group
  function createSpaceGroup(element, translate) {
    const spaceGroup = {
      id: 'space',
      label: translate('SpaceBPMN properties'),
      entries: spaceProps(element, modeler)
    };
    return spaceGroup;
  }

  // Create the custom time group
  function createTimeGroup(element, translate) {
    const timeGroup = {
      id: 'executionTime',
      label: translate('Process Execution time'),
      entries: timeProp(element, modeler)
    };
    return timeGroup;
  }

  // Create the custom condition group
  function createConditionGroup(element, translate) {
    const group = {
      label: translate('Condition'),
      id: 'CamundaPlatform__Condition',
      component: Group,
      entries: ConditionProps({ element })
    };

    if (group.entries.length) {
      return group;
    }

    return null;
  }
}

SpacePropertiesProvider.$inject = ['propertiesPanel', 'translate', 'eventBus', 'spaceModeler'];
