import { useEffect, useState } from 'preact/hooks';
import { TextFieldEntry, NumberFieldEntry, isTextFieldEntryEdited, isNumberFieldEntryEdited, SelectEntry, isSelectEntryEdited } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import { is } from "../../../../util/Util";
import { Assignment } from "./AssignmentProps";
import BindIcon from 'example/bpmn-bind.svg';
import UnbindIcon from 'example/bpmn-unbind.svg';


export default function SpaceProps(element, modeler) {
  const properties = [];

  if (is(element, 'bpmn:Participant')) {
    properties.push({
      id: 'root',
      element,
      modeler,
      component: Root,
      isEdited: isTextFieldEntryEdited
    });
  } else if (is(element, 'bpmn:Task')) {
    properties.push(
      {
        id: 'type',
        element,
        modeler,
        component: TaskType,
        isEdited: isSelectEntryEdited
      },
      {
        id: 'guard',
        element,
        component: Guard,
        isEdited: isTextFieldEntryEdited
      },
      {
        id: 'destination',
        element,
        modeler,
        component: Destination,
        isEdited: isSelectEntryEdited
      },
      {
        id: 'assignment',
        element,
        component: Assignment,
        isEdited: isTextFieldEntryEdited
      }
    );
  } else if (is(element, 'bpmn:DataObjectReference')) {
    properties.push(
      {
        id: 'assignment',
        element,
        component: Assignment,
        isEdited: isTextFieldEntryEdited
      },
    );
  } else if (is(element, 'bpmn:SequenceFlow')) {
    properties.push(
      {
        id: 'guard',
        element,
        component: Guard,
        isEdited: isTextFieldEntryEdited
      }
    );
  } else if (is(element, 'bpmn:MessageFlow')) {
    properties.push(
      {
        id: 'type',
        element,
        modeler,
        component: FlowType,
        isEdited: isSelectEntryEdited
      }
    )
  } else if (is(element, 'bpmn:IntermediateThrowEvent') || is(element, 'bpmn:EndEvent')) {
    properties.push(
      {
        id: 'payload',
        element,
        component: Payload,
        isEdited: isTextFieldEntryEdited
      },
    );
  } else if (is(element, 'bpmn:IntermediateCatchEvent') || is(element, 'bpmn:StartEvent')) {
    properties.push(
      {
        id: 'attribute',
        element,
        component: Attribute,
        isEdited: isTextFieldEntryEdited
      },
    );
  }

  return properties;
}


function Payload(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return element.businessObject.payload || '';
  }

  const setValue = value => {
    return modeling.updateProperties(element, {
      payload: value
    });
  }

  return <TextFieldEntry
    id={id}
    element={element}
    description={translate('')}
    label={translate('Payload')}
    getValue={getValue}
    setValue={setValue}
    debounce={debounce}
  />
}


function Attribute(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return element.businessObject.attribute || '';
  }

  const setValue = value => {
    return modeling.updateProperties(element, {
      attribute: value
    });
  }

  return <TextFieldEntry
    id={id}
    element={element}
    description={translate('')}
    label={translate('Attribute')}
    getValue={getValue}
    setValue={setValue}
    debounce={debounce}
  />
}


function Guard(props) {
  const { element, id } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return element.businessObject.guard || '';
  }

  const setValue = value => {
    return modeling.updateProperties(element, {
      guard: value
    });
  }

  return <TextFieldEntry
    id={id}
    element={element}
    description={translate('')}
    label={translate('Guard')}
    getValue={getValue}
    setValue={setValue}
    debounce={debounce}
  />
}

function Root(props) {
  const { element, id, modeler } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return element.businessObject.root || '';
  }

  const getOptions = () => createOptions();

  function createOptions(overrides = {}) {
    const {
      options = []
    } = overrides;

    let sets = JSON.parse(localStorage.getItem('spaceModel')).logicalPlaces.map((set) => {
      return {
        name: set.name,
        // TODO: valutare destination in real time con l'expression
        id: set.place
      }
    })

    var place = JSON.parse(localStorage.getItem('spaceModel')).places.concat(sets)
    const newOptions = [{
      label: 'None',
      value: null
    },
    ...options];

    if (place.length === 0) {
      return newOptions;
    } else {
      for (let i = 0; i < place.length; i++) {
        newOptions.push(
          {
            label: `${place[i].name}`,
            value: place[i].id
          },
          ...options
        );
      }
      return newOptions;
    }
  }

  const setValue = value => {
    return modeling.updateProperties(element, {
      root: value
    })
  }


  // console.log(element.businessObject)

  // return <TextFieldEntry
  //   id={id}
  //   element={element}
  //   label={translate('Root')}
  //   description={translate('e.g. place_ID')}
  //   getValue={getValue}
  //   setValue={setValue}
  //   debounce={debounce}
  // />

  return <SelectEntry
    id={id}
    element={element}
    label={translate('Initial Position')}
    getValue={getValue}
    getOptions={getOptions}
    setValue={setValue}
    debounce={debounce}
  />
}

function Destination(props) {
  const { element, id, modeler } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return element.businessObject.destination || '';
  }

  const getOptions = () => createOptions();

  function createOptions(overrides = {}) {
    const {
      options = []
    } = overrides;

    let sets = JSON.parse(localStorage.getItem('spaceModel')).logicalPlaces.map((set) => {
      return {
        name: set.name,
        id: set.place
      }
    })

    var place = JSON.parse(localStorage.getItem('spaceModel')).places.concat(sets)
    const newOptions = [{
      label: 'None',
      value: null
    },
    ...options];

    if (place.length === 0) {
      return newOptions;
    } else {
      for (let i = 0; i < place.length; i++) {
        newOptions.push(
          {
            label: `${place[i].name}`,
            value: place[i].id
          },
          ...options
        );
      }
      return newOptions;
    }
  }

  const setValue = value => {
    return modeling.updateProperties(element, {
      destination: value
    })
  }

  // console.log(element.businessObject)

  return (
    <div>
      <SelectEntry
        id={id}
        label={translate('Destination')}
        element={element}
        getValue={getValue}
        getOptions={getOptions}
        setValue={setValue}
        debounce={debounce}
      />
      {/* <TextFieldEntry
        id={id}
        element={element}
        label={translate('Destination')}
        description={translate('e.g. place_ID')}
        getValue={getValue}
        setValue={setValue}
        debounce={debounce}
      /> */}
    </div>
  );
}

function TaskType(props) {
  const { element, id, modeler } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');


  const getValue = () => {
    return element.businessObject.$attrs.type || '';
  }

  const getOptions = () => createOptions();

  function createOptions(overrides = {}) {
    return [
      { label: 'None', value: null }, { label: 'Movement', value: 'movement' }, { label: 'Bind', value: 'bind' }, { label: 'Unbind', value: 'unbind' }
    ];
  }

  const setValue = value => {
    if (value !== null) {
      addCustomIcons(element.id, value)
      return modeling.updateProperties(element, {
        type: value
      })
    }
  }

  // console.log(element.businessObject)

  return (
    <div>
      <SelectEntry
        id={id}
        element={element}
        label={translate('Type')}
        getValue={getValue}
        getOptions={getOptions}
        setValue={setValue}
        debounce={debounce}
      />
    </div>
  );
}

function FlowType(props) {
  const { element, id, modeler } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return element.businessObject.type || '';
  }

  const getOptions = () => createOptions();

  function createOptions(overrides = {}) {
    return [
      { label: 'None', value: null }, { label: 'Bind', value: 'bind' }, { label: 'Unbind', value: 'unbind' }
    ];
  }

  const setValue = value => {
    if (value !== null) {
      document.dispatchEvent(new CustomEvent('bindFlows', { detail: { flows: [element.id] } }));
      return modeling.updateProperties(element, {
        type: value
      })
    }
  }

  return (
    <div>
      <SelectEntry
        id={id}
        element={element}
        label={translate('Type')}
        getValue={getValue}
        getOptions={getOptions}
        setValue={setValue}
        debounce={debounce}
      />
    </div>
  );
}

function addCustomIcons(element, value) {
  const gElement = document.querySelector('g[data-element-id^="' + element + '"]');
  if (!gElement)
    return;
  const childG = gElement.closest('g');

  const polygons = childG.querySelectorAll('polygon');
  polygons.forEach(polygon => polygon.remove());

  const images = childG.querySelectorAll('image');
  images.forEach(image => image.remove());

  if (value === 'movement') {
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const bbox = childG.getBBox();
    const x = bbox.x + bbox.width - 100;
    const y = bbox.y + 12;
    arrow.setAttribute('points', `${x},${y} ${x + 7.5},${y + 7.5} ${x},${y + 15} ${x + 15},${y + 15} ${x + 22.5},${y + 7.5} ${x + 15},${y} ${x},${y}`);
    arrow.setAttribute('fill', 'white');
    arrow.setAttribute('stroke', 'black');
    arrow.setAttribute('stroke-width', '1.5');
    childG.appendChild(arrow);
  } else if (value === 'bind') {
    const bbox = childG.getBBox();
    const x = bbox.x + bbox.width - 110;
    const y = bbox.y - 3;
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    icon.setAttribute('href', BindIcon);
    icon.setAttribute('width', '50');
    icon.setAttribute('height', '50');
    icon.setAttribute('x', x);
    icon.setAttribute('y', y);
    childG.appendChild(icon);
  } else if (value === 'unbind') {
    const bbox = childG.getBBox();
    const x = bbox.x + bbox.width - 100;
    const y = bbox.y - 7;
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    icon.setAttribute('href', UnbindIcon);
    icon.setAttribute('width', '50');
    icon.setAttribute('height', '50');
    icon.setAttribute('x', x);
    icon.setAttribute('y', y);
    childG.appendChild(icon);
  }
}

// TODO: add custom flow
// function addCustomFlow(flow) {
//   const gElement = document.querySelector('g[data-element-id^="' + flow + '"]');
//   if (!gElement)
//     return;
//   const path = gElement.closest('g');
//   path.querySelectorAll('g > path').forEach(child => {
//     if (!child.getAttribute('class', 'djs-hit-stroke')) {
//       // child.setAttribute('style', child.getAttribute('style') + 'marker-start: url("#messageflow-start-white-hsl_225_10_15_-8svbf7f1yeam6uj1nmjn0q53q");');
//       child.setAttribute('style', child.getAttribute('style') + 'marker-end: url("#messageflow-start-white-hsl_225_10_15_-8svbf7f1yeam6uj1nmjn0q53q");');
//       child.setAttribute('style', child.getAttribute('style') + 'stroke-dasharray: 0;');
//     }
//   });
// }