export default function TransitionBehavior(
  simulator,
  scopeBehavior,
  spaceModeler) {

  this._simulator = simulator;
  this._scopeBehavior = scopeBehavior;
  this._spaceModeler = spaceModeler;

  simulator.registerBehavior('space:Transition', this);
}

TransitionBehavior.prototype.enter = function (context) {
  this._simulator.exit(context);
};


TransitionBehavior.prototype.exit = function (context) {
  const {
    element,
    scope,
    parentScope
  } = context;

  let tokenColor = context.initiator.colors.primary;
  this._removeCircle(element.businessObject.sourcePlace.id, parentScope.element.id);

  if (element['connections'].length > 0) {
    const next = element['connections'].shift()
    next['connections'] = element['connections']
    next['activatedFlows'] = element['activatedFlows']
    this._simulator.enter({
      element: next,
      scope: scope.parent,
      parentScope
    });
  }
  else {
    element['activatedFlows'].forEach(
      element => this._simulator.enter({
        element,
        scope: parentScope
      })
    );
    this._appendCircle(element.businessObject.targetPlace.id, tokenColor, parentScope.element.id);
  }
  this._simulator._processStateMap.set(parentScope.element.id + '.position', element.businessObject.targetPlace.id);
  const mapArray = Array.from(this._simulator._processStateMap.entries());
  const mapJson = JSON.stringify(mapArray);
  localStorage.setItem('processStateMap', mapJson);
  document.dispatchEvent(new CustomEvent('processStateMapUpdate'));
};

TransitionBehavior.prototype._removeCircle = function (place, participant) {
  const elements = this._spaceModeler._canvaspace.canvas._elementRegistry._elements;
  if (elements.hasOwnProperty(place)) {
    let htmlString = elements[place].gfx.innerHTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const circles = doc.querySelectorAll(`circle.${participant}`);
    circles.forEach(circle => {
      circle.parentNode.removeChild(circle);
    });
    elements[place].gfx.innerHTML = new XMLSerializer().serializeToString(doc);
  }
}

TransitionBehavior.prototype._appendCircle = function (place, color, participant) {
  const elements = this._spaceModeler._canvaspace.canvas._elementRegistry._elements;
  if (elements.hasOwnProperty(place)) {
    let htmlString = elements[place].gfx.innerHTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const gElement = doc.querySelector('g.djs-visual');
    const existingCircles = gElement.querySelectorAll('circle.participant-circle');

    let cx = 10; // Initial x position
    if (existingCircles.length > 0) {
      const lastCircle = existingCircles[existingCircles.length - 1];
      const lastCircleCx = parseFloat(lastCircle.getAttribute('cx'));
      cx = lastCircleCx + 2 * 12 + 5; // Adjust spacing (5 is padding) as needed
    }

    const newCircle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
    newCircle.setAttribute('cx', cx.toString()); // Adjust as necessary for positioning
    newCircle.setAttribute('cy', '90'); // Adjust as necessary for positioning
    newCircle.setAttribute('r', '12');
    newCircle.setAttribute('style', `fill: ${color};`);
    newCircle.classList.add('participant-circle')
    newCircle.classList.add(participant)

    gElement.appendChild(newCircle);
    elements[place].gfx.innerHTML = new XMLSerializer().serializeToString(doc);
  }
}

TransitionBehavior.$inject = [
  'simulator',
  'scopeBehavior',
  'spaceModeler'
];