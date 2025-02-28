/* global process */

'use strict';
import $ from 'jquery';
import TokenSimulationModule from '..';
import AddExporter from '@bpmn-io/add-exporter';
import {
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';

import fileDrop from 'file-drops';
import fileOpen from 'file-open';
import download from 'downloadjs';
import Zip from 'jszip';
import bearBPMN from '../example/resources/test.bpmn';
import emptyBPMN from '../example/resources/newDiagram.bpmn';
import OlcModeler from './lib/olcmodeler/OlcModeler';
import Mediator from './lib/mediator/Mediator';
import BpmnSpaceModeler from './lib/bpmnmodeler/bpmnSpaceModeler';
import { downloadZIP, uploadZIP } from './lib/util/FileUtil';
import { OlcPropertiesPanelModule, OlcPropertiesProviderModule } from "./olc-js-properties-panel";
import BpmnColorPickerModule from 'bpmn-js-color-picker';
/********/
// Map imports
/********/
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Stroke from 'ol/style/Stroke.js';
import { Style } from 'ol/style';
import { useGeographic } from 'ol/proj';
import { OSM, Vector as VectorSource } from 'ol/source.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
// import { Draw, Snap, Modify, Interaction } from "ol/interaction";
import Feature from 'ol/Feature.js';
import LineString from 'ol/geom/LineString.js';
import Point from 'ol/geom/Point.js';
import Polygon from 'ol/geom/Polygon.js';
import spaceModel from './spacemodel.json';
import Graph from 'graphology';
import { dijkstra } from 'graphology-shortest-path';
import { easeOut } from 'ol/easing';
import { unByKey } from 'ol/Observable';
import { Circle as CircleStyle, Fill, Text } from 'ol/style';


const url = new URL(window.location.href);
const persistent = url.searchParams.has('p');
const active = url.searchParams.has('e');
const presentationMode = url.searchParams.has('pm');

let fileName = 'diagram.bpmn';

const initialDiagram = (() => {
    try {
        return persistent && localStorage['diagram-xml'] || bearBPMN;
    } catch (err) {
        return bearBPMN;
    }
})();

function showMessage(cls, message) {
    const messageEl = document.querySelector('.drop-message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `drop-message ${cls || ''}`;
        messageEl.style.display = 'block';
    }
}

function hideMessage() {
    const messageEl = document.querySelector('.drop-message');
    if (messageEl) {
        messageEl.style.display = 'none';
    }
}

if (persistent) {
    hideMessage();
}

// Mediator for communication between the two modelers
var mediator = new Mediator();
window.mediator = mediator;

// Modeler for space
// var olcModeler = new OlcModeler({
//     container: document.querySelector('#olc-canvas'),
//     keyboard: {
//         bindTo: document.querySelector('#olc-canvas')
//     },
//     additionalModules: [
//         {
//             __init__: ['mediator'],
//             mediator: ['type', mediator.OlcModelerHook]
//         },
//         OlcPropertiesProviderModule,
//         OlcPropertiesPanelModule,
//         // BpmnColorPickerModule,
//     ],
//     propertiesPanel: {
//         parent: '#properties-panel-olc',
//     }
// });

// Create a BPMN modeler
var modeler = new BpmnSpaceModeler({
    container: '#canvas',
    keyboard: {
        bindTo: document
    },
    exporter: {
        name: 'bpmn-js-token-simulation',
        version: process.env.TOKEN_SIMULATION_VERSION
    },
    additionalModules: [
        {
            __init__: ['mediator'],
            mediator: ['type', mediator.SpaceModelerHook]
        },
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        TokenSimulationModule,
        AddExporter,
        //BpmnColorPickerModule,

    ],
    propertiesPanel: {
        parent: '#properties-panel'
    }
});

localStorage.setItem('processStateMap', '{}');

const olcPropertiesPanel = document.querySelector('#properties-panel-olc');
const propertiesPanel = document.querySelector('#properties-panel');

const propertiesPanelToggle = document.querySelector('#properties-panel-toggle');
const olcPropertiesPanelResizer = document.querySelector('#properties-panel-resizer-olc');
const propertiesPanelResizer = document.querySelector('#properties-panel-resizer');

const dataPanelToggle = document.querySelector('#data-panel-toggle');
const dataPanel = document.querySelector('#data-panel');

let startX, startWidth;

function togglePropertiesPanel() {
    const olcPanelOpen = olcPropertiesPanel && olcPropertiesPanel.classList.contains('open');
    const bpmnPanelOpen = propertiesPanel && propertiesPanel.classList.contains('open');

    if (olcPanelOpen || bpmnPanelOpen) {
        toggleOlcProperties(false);
        toggleProperties(false);
    } else {
        toggleOlcProperties(true);
    }
}

function toggleDataPanel() {
    dataPanel.innerHTML = '';

    const dataPanelOpen = dataPanel && dataPanel.classList.contains('open');

    if (dataPanelOpen) {
        toggleDataProperties(false);
    } else {
        toggleDataProperties(true);
    }
}

function toggleOlcProperties(open) {
    if (olcPropertiesPanel) {
        if (open) {
            url.searchParams.set('olcpp', '1');
        } else {
            url.searchParams.delete('olcpp');
        }
        history.replaceState({}, document.title, url.toString());
        olcPropertiesPanel.classList.toggle('open', open);
    }
}

// document.addEventListener('resetSim', async () => {
//     await olcModeler.importXML(localStorage.getItem('space-model'));
// });

// document.addEventListener('tokenSimulation.toggleMode', async (active) => {
//     console.log('tokenSimulation.toggleMode', active);
//     const olcs = (await olcModeler.saveXML({ format: true })).xml;
//     localStorage.setItem('space-model', olcs);
// });

document.addEventListener('processStateMapUpdate', () => {
    const dataPanelOpen = dataPanel && dataPanel.classList.contains('open');
    if (dataPanelOpen)
        updateDataProperties()
});

function toggleDataProperties(open) {
    if (dataPanel) {
        history.replaceState({}, document.title, url.toString());
        dataPanel.classList.toggle('open', open);
        if (open)
            updateDataProperties()
    }
}

document.addEventListener('spaceModelUpdated', (event) => updateDataProperties());

function updateDataProperties() {
    const spaceModel = JSON.parse(localStorage.getItem('spaceModel'));
    dataPanel.innerHTML = "";
    spaceModel.places = spaceModel.sets.concat(spaceModel.places)
    if (spaceModel) {
        ['places', 'edges'].forEach(key => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'group';

            const titleDiv = document.createElement('div');
            titleDiv.className = 'title';
            titleDiv.textContent = key.charAt(0).toUpperCase() + key.slice(1);
            groupDiv.appendChild(titleDiv);

            spaceModel[key].forEach((element) => {
                const entryDiv = document.createElement('div');
                entryDiv.className = 'entry';

                const keySpan = document.createElement('h6');
                keySpan.textContent = element.name;
                entryDiv.appendChild(keySpan);

                if (element.attributes) {
                    Object.keys(element.attributes).forEach(attrKey => {
                        const attrDiv = document.createElement('div');
                        attrDiv.className = 'attribute';

                        const attrKeySpan = document.createElement('span');
                        attrKeySpan.textContent = `${attrKey}: `;
                        const attrValueText = document.createTextNode(element.attributes[attrKey]);

                        attrDiv.appendChild(attrKeySpan);
                        attrDiv.appendChild(attrValueText);
                        entryDiv.appendChild(attrDiv);
                    });
                }

                entryDiv.addEventListener('mouseover', () => {
                    if (element.id.startsWith("set"))
                        getSetPlaces(element.id).forEach(place => colorPlace(place));
                    else if (element.id.startsWith("place"))
                        colorPlace(element.id);
                    else if (element.id.startsWith("edge"))
                        colorEdge(element.id);
                });

                entryDiv.addEventListener('mouseout', () => {
                    if (element.id.startsWith("set"))
                        getSetPlaces(element.id).forEach(place => uncolorPlace(place));
                    else if (element.id.startsWith("place"))
                        uncolorPlace(element.id);
                    else if (element.id.startsWith("edge"))
                        uncolorEdge(element.id);
                });

                groupDiv.appendChild(entryDiv);
            });

            dataPanel.appendChild(groupDiv);
        })
    }
}

function toggleProperties(open) {
    if (propertiesPanel) {
        if (open) {
            url.searchParams.set('pp', '1');
        } else {
            url.searchParams.delete('pp');
        }
        history.replaceState({}, document.title, url.toString());
        propertiesPanel.classList.toggle('open', open);
    }
}

if (propertiesPanelToggle) {
    propertiesPanelToggle.addEventListener('click', function (event) {
        togglePropertiesPanel();
    });
}

if (dataPanelToggle) {
    dataPanelToggle.addEventListener('click', function (event) {
        toggleDataPanel();
    });
}

if (olcPropertiesPanelResizer) {
    olcPropertiesPanelResizer.addEventListener('click', function (event) {
        toggleDataProperties(false);
        toggleOlcProperties(!olcPropertiesPanel.classList.contains('open'));
    });

    olcPropertiesPanelResizer.addEventListener('dragstart', function (event) {
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        event.dataTransfer.setDragImage(img, 1, 1);
        startX = event.screenX;
        startWidth = olcPropertiesPanel.getBoundingClientRect().width;
    });

    olcPropertiesPanelResizer.addEventListener('drag', function (event) {
        if (!event.screenX) {
            return;
        }
        const delta = event.screenX - startX;
        const width = startWidth - delta;
        const open = width > 200;
        olcPropertiesPanel.style.width = open ? `${width}px` : null;
        toggleOlcProperties(open);
    });
}

if (propertiesPanelResizer) {
    propertiesPanelResizer.addEventListener('click', function (event) {
        toggleDataProperties(false);
        toggleProperties(!propertiesPanel.classList.contains('open'));
    });

    propertiesPanelResizer.addEventListener('dragstart', function (event) {
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        event.dataTransfer.setDragImage(img, 1, 1);
        startX = event.screenX;
        startWidth = propertiesPanel.getBoundingClientRect().width;
    });

    propertiesPanelResizer.addEventListener('drag', function (event) {
        if (!event.screenX) {
            return;
        }
        const delta = event.screenX - startX;
        const width = startWidth - delta;
        const open = width > 200;
        propertiesPanel.style.width = open ? `${width}px` : null;
        toggleProperties(open);
    });
}

const remoteDiagram = url.searchParams.get('diagram');

if (remoteDiagram) {
    fetch(remoteDiagram).then(
        r => {
            if (r.ok) {
                return r.text();
            }
            throw new Error(`Status ${r.status}`);
        }
    ).then(
        text => openDiagram(text)
    ).catch(
        err => {
            showMessage('error', `Failed to open remote diagram: ${err.message}`);
            openDiagram(initialDiagram);
        }
    );
} else {
    openDiagram(initialDiagram);
}

toggleProperties(url.searchParams.has('pp'));

// Function to show the loading spinner
function showLoadingSpinner() {
    document.getElementById('loading-spinner').classList.remove('hidden');
}

// Function to hide the loading spinner
function hideLoadingSpinner() {
    document.getElementById('loading-spinner').classList.add('hidden');
}

// Show the loading overlay
function showLoadingOverlay() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

// Hide the loading overlay
function hideLoadingOverlay() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

async function createNewDiagram() {
    showLoadingSpinner();
    showLoadingOverlay();
    // await olcModeler.createNew();
    await modeler.importXML(bearBPMN);
    hideLoadingSpinner();
    hideLoadingOverlay();
}

async function createEmptyDiagram() {
    showLoadingSpinner();
    showLoadingOverlay();
    // await olcModeler.createEmpty();
    await modeler.importXML(emptyBPMN);
    hideLoadingSpinner();
    hideLoadingOverlay();
}

$(function () {
    createNewDiagram();
});

function openDiagram(diagram) {
    return modeler.importXML(diagram)
        .then(({ warnings }) => {
            // if (warnings.length) {
            //     console.warn(warnings);
            // }
            modeler.get('canvas').zoom('0.7');
        })
        .catch(err => {
            console.error(err);
        });
}

function openFile(files) {
    if (!files.length) {
        return;
    }
    hideMessage();
    const fileName = files[0].name;
    openDiagram(files[0].contents);
}

document.body.addEventListener('dragover', fileDrop('Open BPMN diagram', openFile), false);

function loadDiagram(xml) {
    const fileInput = document.createElement("input");
    document.body.appendChild(fileInput);
    $(fileInput).attr({ 'type': 'file' }).on('change', function (e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        if (file) {
            reader.readAsText(file, "UTF-8");
            reader.onload = function (evt) {
                const bpmnXML = evt.target.result;
                modeler.importXML(bpmnXML, function (err) {
                    if (err) {
                        return console.error('could not import BPMN 2.0 diagram', err);
                    }
                    const canvas = modeler.get('canvas');
                    canvas.zoom('fit-viewport');
                });
            }
            reader.onerror = function (evt) {
                document.getElementById("fileContents").innerHTML = "error reading file";
            }
        }
    }).trigger('click');
    document.body.removeChild(fileInput);
}


// async function importFromZip(zipData) {
//     const zip = await Zip.loadAsync(zipData, { base64: true });

//     let files = {
//         space: null,
//         olcs: null
//     };

//     // Iterate over all files in the zip
//     zip.forEach((relativePath, file) => {
//         if (relativePath.endsWith('.bpmn')) {
//             files.space = file;
//         } else if (relativePath.endsWith('.xml')) {
//             files.olcs = file;
//         }
//     });

//     // Check if the required files are found
//     Object.keys(files).forEach(key => {
//         if (!files[key]) {
//             throw new Error('Missing file: ' + key);
//         }
//     });

//     // Import the XML content of the files
//     await olcModeler.importXML(await files.olcs.async("string"));
//     localStorage.setItem('space-model', await files.olcs.async("string"));
//     await modeler.importXML(await files.space.async("string"));
// }

document.querySelector("#open-diagram").addEventListener('click', () => uploadZIP(async data => {
    if (data.startsWith('data:')) {
        data = data.split(',')[1];
    }
    await importFromZip(data);
}, 'base64'));

function downloadDiagram() {
    modeler.saveXML({ format: true }, function (err, xml) {
        if (!err) {
            download(xml, fileName, 'application/xml');
        }
    });
}

document.querySelector("#erase-button").addEventListener('click', () => {
    createEmptyDiagram()
});

document.body.addEventListener('keydown', function (event) {
    if (event.code === 'KeyS' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        downloadDiagram();
    }
    if (event.code === 'KeyO' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        fileOpen().then(openFile);
    }
});

// async function exportToZip() {
//     const zip = new Zip();
//     const space = (await modeler.saveXML({ format: true })).xml;
//     zip.file('behaviour.bpmn', space);
//     const olcs = (await olcModeler.saveXML({ format: true })).xml;
//     zip.file('space.xml', olcs);
//     return zip.generateAsync({ type: 'base64' });
// }

document.querySelector('#download-button').addEventListener('click', () => exportToZip().then(zip => {
    downloadZIP('BEAR.zip', zip, 'base64');
}));

var dragTarget;

window.addEventListener('mousemove', function (e) { dragmove(e); });
window.addEventListener('touchmove', function (e) { dragmove(e); });
window.addEventListener('mouseup', dragend);
window.addEventListener('touchend', dragend);
$('.divider').each((index, divider) => {
    divider.addEventListener('mousedown', function (e) { dragstart(e); });
    divider.addEventListener('touchstart', function (e) { dragstart(e); });
});

function dragstart(e) {
    e.preventDefault();
    dragTarget = e.target;
}

function dragmove(e) {
    if (dragTarget) {
        dragTarget.classList.add('dragged');
        const parent = $(dragTarget).parent()[0];
        const parentStyle = window.getComputedStyle(parent);
        const prev = $(dragTarget).prev('div')[0];
        const next = $(dragTarget).next('div')[0];
        if (dragTarget.classList.contains('vertical')) {
            const parentInnerWidth = parseInt(parentStyle.width, 10) - parseInt(parentStyle.paddingLeft, 10) - parseInt(parentStyle.paddingRight, 10);
            const percentage = ((e.pageX - (parent.getBoundingClientRect().left + parseInt(parentStyle.paddingLeft, 10))) / parentInnerWidth) * 100;
            if (percentage > 5 && percentage < 95) {
                const mainPercentage = 100 - percentage;
                prev.style.width = percentage + '%';
                next.style.width = mainPercentage + '%';
                dragTarget.style.left = `calc(${percentage * (parentInnerWidth / parseInt(parentStyle.width, 10))}% - 10px - ${parentStyle.paddingLeft})`;
                next.style.left = '0%';
            }
        } else {
            const parentInnerHeight = parseInt(parentStyle.height, 10) - parseInt(parentStyle.paddingTop, 10) - parseInt(parentStyle.paddingBottom, 10);
            const percentage = ((e.pageY - (parent.getBoundingClientRect().top + parseInt(parentStyle.paddingTop, 10))) / parentInnerHeight) * 100;
            if (percentage > 5 && percentage < 95) {
                const mainPercentage = 100 - percentage;
                prev.style.height = percentage + '%';
                next.style.height = mainPercentage + '%';
                dragTarget.style.top = `calc(${percentage * (parentInnerHeight / parseInt(parentStyle.height, 10))}% - 10px + ${parentStyle.paddingTop})`;
                next.style.top = '0%';
            }
        }
    }
}

function dragend() {
    $('.divider').each((index, divider) => {
        divider.classList.remove('dragged');
    });
    dragTarget = undefined;
}

// Add event listeners for element selection
modeler.get('eventBus').on('element.click', function (event) {
    mediator.switchPropertyPanel(event.element);
});

// olcModeler.get('eventBus').on('element.click', function (event) {
//     mediator.switchPropertyPanel(event.element);
// });

/********/
// Map code
/********/
localStorage.setItem('spaceModel', JSON.stringify(spaceModel));
const participants = [];

const raster = new TileLayer({
    source: new OSM(),
});
const source = new VectorSource();
const vector = new VectorLayer({
    source: source,
    style: {
        'fill-color': 'rgba(255, 255, 255, 0.2)',
        'stroke-color': 'red',
        'stroke-width': 2,
        'circle-radius': 7,
        'circle-fill-color': '#ffcc33',
    },
});

useGeographic();

let extent = [13.067553, 43.138806, 13.068553, 43.139806]
const map = new Map({
    layers: [raster, vector],
    target: 'map',
    view: new View({
        center: [13.068307772123394, 43.139407493133405],
        zoom: 19,
        rotation: 0.5,
        maxZoom: 19,
        minZoom: 19,
        extent: extent,
        constrainOnlyCenter: true,
        smoothExtentConstraint: true,
    }),
});

function calculateCenter(boundaries) {
    let x = 0;
    let y = 0;
    boundaries.forEach((coordinate) => {
        x += coordinate[0];
        y += coordinate[1];
    });
    return [x / boundaries.length, y / boundaries.length];
}

spaceModel.places.forEach((place) => {
    const lineFeature = new Feature({
        geometry: new LineString(place.boundaries.concat([place.boundaries[0]])),
    });
    lineFeature.setId(place.id + '_boundaries');
    source.addFeature(lineFeature);

    let center
    place.centroid ? center = place.centroid : center = calculateCenter(place.boundaries);
    const centerFeature = new Feature({
        geometry: new Point(center),
    });

    centerFeature.setStyle(new Style({
        text: new Text({
            text: place.name,
            font: '8px Calibri,sans-serif',
            fill: new Fill({ color: '#000' }),
            stroke: new Stroke({
                color: '#fff', width: 2
            }),
        }),
    }))
    centerFeature.setId(place.id + '_centroid');
    source.addFeature(centerFeature);
})

spaceModel.sets.forEach((set) => {
    const centerFeature = new Feature({
        geometry: new Point(set.centroid),
    });

    centerFeature.setStyle(new Style({
        text: new Text({
            text: set.name,
            font: '11px Calibri,sans-serif',
            fill: new Fill({ color: '#000' }),
            stroke: new Stroke({
                color: '#fff', width: 3
            }),
        }),
    }))
    centerFeature.setId(set.id + '_centroid');
    source.addFeature(centerFeature);
})

function getSetPlaces(set) {
    const p = spaceModel.sets.find(s => s.id === set);
    return p.places
}

function colorPlace(place) {
    const p = spaceModel.places.find(p => p.id === place);
    const polygonFeature = new Feature({
        geometry: new Polygon([p.boundaries.concat([p.boundaries[0]])]),
    });
    polygonFeature.setStyle(new Style({
        fill: new Fill({
            color: 'rgba(255, 0, 0, 0.5)', // Green color with 50% opacity
        }),
        stroke: new Stroke({
            color: 'green',
            width: 2,
        }),
    }));
    polygonFeature.setId(place + '_area');
    source.addFeature(polygonFeature);
}

function uncolorPlace(place) {
    source.removeFeature(source.getFeatureById(place + '_area'));
}

function colorEdge(edge) {
    const e = spaceModel.edges.find(e => e.id === edge);
    if (e) {
        const sourcePlace = spaceModel.places.find(place => place.id === e.source);
        const targetPlace = spaceModel.places.find(place => place.id === e.target);

        const sourceCoords = sourcePlace?.centroid || (sourcePlace?.boundaries ? calculateCenter(sourcePlace.boundaries) : undefined);
        const targetCoords = targetPlace?.centroid || (targetPlace?.boundaries ? calculateCenter(targetPlace.boundaries) : undefined);
        if (sourceCoords && targetCoords) {
            const lineFeature = new Feature({
                geometry: new LineString([sourceCoords, targetCoords]),
            });
            lineFeature.setStyle(new Style({
                stroke: new Stroke({
                    color: 'rgba(255, 0, 0)', // Red color with 50% opacity
                    width: 2,
                }),
            }));
            lineFeature.setId(edge + '_colored');
            source.addFeature(lineFeature);
        }
    }
}

function uncolorEdge(edge) {
    source.removeFeature(source.getFeatureById(edge + '_colored'));
}

function drawGraph() {
    spaceModel.edges.forEach((edge) => {
        drawGraphEdge(edge);
    })
}

function drawGraphEdge(edge) {
    let sourcePlace = spaceModel.places.find(place => place.id === edge.source);
    let sourceCoords = sourcePlace?.centroid || (sourcePlace?.boundaries ? calculateCenter(sourcePlace.boundaries) : undefined);
    let targetPlace = spaceModel.places.find(place => place.id === edge.target);
    let targetCoords = targetPlace?.centroid || (targetPlace?.boundaries ? calculateCenter(targetPlace.boundaries) : undefined);
    if (sourceCoords && targetCoords) {
        const lineFeature = new Feature({
            geometry: new LineString([sourceCoords, targetCoords]),
        });
        lineFeature.setStyle(new Style({
            stroke: new Stroke({
                color: 'yellow',
                width: 2,
                lineDash: [2, 7],
            }),
        }));
        lineFeature.setId(edge.id);
        source.addFeature(lineFeature);
    }
}

const graph = new Graph();
spaceModel.places.forEach((place) => graph.addNode(place.id, { coordinates: place.centroid || calculateCenter(place.boundaries) }));
spaceModel.edges.forEach((edge) => graph.addEdge(edge.source, edge.target, { id: edge.id, weight: edge.attributes.weight || 1 }));

document.addEventListener('edgeAdded', (event) => {
    const edge = event.detail;
    // TODO: un arco rimosso in precedenza non viene riaggiunto correttamente "perchè già esiste"
    // console.log('Drawing edge');
    drawGraphEdge(edge);
    // console.log('Drawn edge');
    if (!graph.hasEdge(edge.source, edge.target)) {
        // console.log('Adding edge');
        graph.addEdge(edge.source, edge.target, { id: edge.id, weight: edge.attributes.weight || 1 });
        // console.log('edgeAdded', edge);
    }
})

document.addEventListener('edgeRemoved', (event) => {
    const edge = event.detail;
    graph.dropEdge(edge.source, edge.target);
    source.removeFeature(source.getFeatureById(edge.id))
});

drawGraph();

// map.on('click', function (event) {
//     const coordinates = event.coordinate;
//     console.log('Coordinates:', coordinates);
// });

function animateToken(tokenFeature, start, end, duration, destination) {
    return new Promise((resolve) => {
        const startTime = Date.now();

        function animate(event) {
            const elapsed = event.frameState.time - startTime;
            const fraction = easeOut(Math.min(elapsed / duration, 1));

            if (fraction >= 1) {
                const n = participants.filter(p => p.root === destination).length
                tokenFeature.setGeometry(new Point([end[0] + 0.00002 * (n), end[1]]));
                unByKey(listenerKey);
                resolve();
            } else {
                const currentCoordinates = [
                    start[0] + fraction * (end[0] - start[0]),
                    start[1] + fraction * (end[1] - start[1]),
                ];
                tokenFeature.setGeometry(new Point(currentCoordinates));
            }
        }

        let type = 'postrender';
        let func = animate;
        const listenerKey = map.on(type, func);
    });
}

async function moveToken(movement) {
    let { destination, participant } = movement;

    let start = participants.find(p => p.id === participant.id).root
    if (!start) {
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('movement_stop_' + participant.id, { detail: { cause: "noRoot" } }));
        }, 1000);
        return;
    }

    const path = dijkstra.singleSource(graph, start)[destination];

    if (!path) {
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('movement_stop_' + participant.id, { detail: { cause: "destinationUnreachable" } }));
        }, 1000);
        return;
    }

    if (path.length < 2) {
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('movement_stop_' + participant.id, { detail: { cause: "destinationReached" } }));
        }, 1000);
        return;
    }

    let tokenFeature = source.getFeatureById(participant.id);
    if (tokenFeature)
        source.removeFeature(tokenFeature);

    tokenFeature = new Feature({
        geometry: new Point(graph.getNodeAttribute(path[0], 'coordinates')),
    })
    tokenFeature.setId(participant.id);

    const tokenStyle = new Style({
        image: new CircleStyle({
            radius: 7,
            fill: new Fill({ color: participant.color }),
            // stroke: new Stroke({ color: 'black', width: 1 }),
        }),
    });

    tokenFeature.setStyle(tokenStyle);
    source.addFeature(tokenFeature);

    const s = graph.getNodeAttribute(path[0], 'coordinates');
    const e = graph.getNodeAttribute(path[1], 'coordinates');
    const edge = graph.edges().find(edge => {
        const source = graph.source(edge);
        const target = graph.target(edge);
        return (source === path[0] && target === path[1])
    });
    const duration = 1000 * graph.getEdgeAttribute(edge, 'weight');
    const startTime = Date.now();

    await animateToken(tokenFeature, s, e, duration, path[1]);

    participants[participants.findIndex(p => p.id === participant.id)].root = path[1];

    moveToken(movement);
}

document.addEventListener('movement_start', (event) => moveToken(event.detail));

function placeToken(participant) {
    let tokenFeature = new Feature({
        geometry: new Point(graph.getNodeAttribute(participant.root, 'coordinates')),
    });

    const n = participants.filter(p => p.root === participant.root).length
    const originalCoordinates = graph.getNodeAttribute(participant.root, 'coordinates');
    tokenFeature = new Feature({
        geometry: new Point([originalCoordinates[0] + 0.00002 * (n - 1), originalCoordinates[1]]),
    });

    const tokenStyle = new Style({
        image: new CircleStyle({
            radius: 7,
            fill: new Fill({ color: participant.color }),
            // stroke: new Stroke({ color: 'black', width: 2 }),
        }),
    });
    tokenFeature.setStyle(tokenStyle);
    tokenFeature.setId(participant.id);
    source.addFeature(tokenFeature);
}

document.addEventListener('process_start', (event) => {
    const participant = event.detail.participant;
    participants.push(participant);
    placeToken(participant)
});
