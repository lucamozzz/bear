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
import exampleXML from '../example/resources/prova.bpmn';
import OlcModeler from './lib/olcmodeler/OlcModeler';
import Mediator from './lib/mediator/Mediator';
import BpmnSpaceModeler from './lib/bpmnmodeler/bpmnSpaceModeler';
import { downloadZIP, uploadZIP } from './lib/util/FileUtil';
import { OlcPropertiesPanelModule, OlcPropertiesProviderModule } from "./olc-js-properties-panel";

import BpmnColorPickerModule from 'bpmn-js-color-picker';


const url = new URL(window.location.href);
const persistent = url.searchParams.has('p');
const active = url.searchParams.has('e');
const presentationMode = url.searchParams.has('pm');

let fileName = 'diagram.bpmn';

const initialDiagram = (() => {
    try {
        return persistent && localStorage['diagram-xml'] || exampleXML;
    } catch (err) {
        return exampleXML;
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
var olcModeler = new OlcModeler({
    container: document.querySelector('#olc-canvas'),
    keyboard: {
        bindTo: document.querySelector('#olc-canvas')
    },
    additionalModules: [
        {
            __init__: ['mediator'],
            mediator: ['type', mediator.OlcModelerHook]
        },
        OlcPropertiesProviderModule,
        OlcPropertiesPanelModule,
        // BpmnColorPickerModule,
    ],
    propertiesPanel: {
        parent: '#properties-panel-olc',
    }
});

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

function updateDataProperties() {
    dataPanel.innerHTML = "";
    const mapJson = localStorage.getItem('processStateMap');
    if (mapJson) {
        new Map(JSON.parse(mapJson)).forEach((value, key) => {
            if (key !== 'undefined' && value !== 'undefined'){   
                const entryDiv = document.createElement('div');
                entryDiv.className = 'entry';
                const keySpan = document.createElement('span');
                keySpan.textContent = `${key}: `;
                const valueText = document.createTextNode(value);
                entryDiv.appendChild(keySpan);
                entryDiv.appendChild(valueText);
                dataPanel.appendChild(entryDiv);
            }
        });
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

async function createNewDiagram() {
    await modeler.importXML(exampleXML);
    await olcModeler.createNew(); // Initialize XML of the OLC modeler
}

$(function () {
    createNewDiagram();
});

function openDiagram(diagram) {
    return modeler.importXML(diagram)
        .then(({ warnings }) => {
            if (warnings.length) {
                console.warn(warnings);
            }
            modeler.get('canvas').zoom('fit-viewport');
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


async function importFromZip(zipData) {
    const zip = await Zip.loadAsync(zipData, { base64: true });
    
    let files = {
        space: null,
        olcs: null
    };

    // Iterate over all files in the zip
    zip.forEach((relativePath, file) => {
        if (relativePath == 'behaviour.bpmn' || relativePath.endsWith('/behaviour.bpmn')) {
            files.space = file;
        } else if (relativePath == 'space.xml' || relativePath.endsWith('/space.xml')) {
            files.olcs = file;
        }
    });

    // Check if the required files are found
    Object.keys(files).forEach(key => {
        if (!files[key]) {
            throw new Error('Missing file: ' + key);
        }
    });

    // Import the XML content of the files
    await olcModeler.importXML(await files.olcs.async("string"));
    await modeler.importXML(await files.space.async("string"));
}

document.querySelector("#open-diagram").addEventListener('click', () => uploadZIP(data => {
    if (data.startsWith('data:')) {
        data = data.split(',')[1];
    }
    importFromZip(data);
}, 'base64'));

function downloadDiagram() {
    modeler.saveXML({ format: true }, function (err, xml) {
        if (!err) {
            download(xml, fileName, 'application/xml');
        }
    });
}

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

async function exportToZip() {
    const zip = new Zip();
    const space = (await modeler.saveXML({ format: true })).xml;
    zip.file('behaviour.bpmn', space);
    const olcs = (await olcModeler.saveXML({ format: true })).xml;
    zip.file('space.xml', olcs);
    return zip.generateAsync({ type: 'base64' });
}

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

olcModeler.get('eventBus').on('element.click', function (event) {
    mediator.switchPropertyPanel(event.element);
});