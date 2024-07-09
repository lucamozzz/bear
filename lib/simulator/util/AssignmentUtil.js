
import { is } from "../../../example/lib/util/Util";

function parseAssignmentOlc(assignmentOlc) {
    const assignmentObj = {};
    if (assignmentOlc && typeof assignmentOlc === "string") {
        assignmentOlc.split(',').forEach(assignment => {
            const parts = assignment.split("=").map(part => part.trim().replace(/"/g, ''));
            if (parts.length === 2) {
                assignmentObj[parts[0]] = parts[1];
            }
        });
    }
    return assignmentObj;
}

function parseElementAssignment(assignment) {
    const assignmentObj = {};
    if (assignment && typeof assignment === "string") {
        const separator = assignment.includes(';') ? ';' : ',';
        assignment.split(separator).forEach(part => {
            const [fullKey, value] = part.split('=').map(item => item.trim());
            if (fullKey && value !== undefined) {
                if (fullKey.startsWith("delete")) {
                    if (!assignmentObj["delete"]) {
                        assignmentObj["delete"] = [];
                    }
                    assignmentObj["delete"].push(value);
                } else if (fullKey.startsWith("add")) {
                    if (!assignmentObj["add"]) {
                        assignmentObj["add"] = [];
                    }
                    assignmentObj["add"].push(value);
                } else {
                    const [placeName, key] = fullKey.split('.');
                    if (!assignmentObj[placeName]) {
                        assignmentObj[placeName] = {};
                    }
                    assignmentObj[placeName][key] = value;
                }
            }
        });
    }
    return assignmentObj;
}

function parseActivityAssignment(element) {
    const assignment = element.assignment;
    const assignmentObj = {};
    if (assignment && typeof assignment === "string") {
        const separator = assignment.includes(';') ? ';' : ',';
        assignment.split(separator).forEach(part => {
            let [fullKey, value] = part.split('=').map(item => item.trim());
            if (fullKey && value !== undefined) {
                if (!fullKey.includes('.'))
                    fullKey = element.$parent.id + '.' + fullKey;
                else fullKey = 'Place_' + fullKey;
                const [placeName, key] = fullKey.split('.');
                if (!assignmentObj[placeName]) {
                    assignmentObj[placeName] = {};
                }
                if (key === 'connect' && assignmentObj[placeName][key]) {
                    assignmentObj[placeName][key] += ',' + value;
                } else if (key === 'disconnect' && assignmentObj[placeName][key]) {
                    assignmentObj[placeName][key] += ',' + value;
                } else {
                    assignmentObj[placeName][key] = value;
                }
            }
        });
    }
    return assignmentObj;
}

function parseDataObjectAssignments(assignments) {
    const assignmentObj = {};

    if (assignments && typeof assignments === "string") {
        const separator = assignments.includes(';') ? ';' : ',';
        assignments.split(separator).forEach(assignment => {
            const [key, value] = assignment.split('=').map(item => item.trim());
            if (key && value !== undefined)
                assignmentObj[key] = value;
        });
    }

    return assignmentObj;
}

function findPlaceByName(placeName, spaceModeler) {
    const allElements = spaceModeler._canvaspace.canvas._elementRegistry.getAll();
    return allElements.find(element =>
        is(element.businessObject, 'space:Place') && element.businessObject.name === placeName) || null;
}

function findTransitionByName(deleteValue, spaceModeler) {
    if (typeof deleteValue !== 'string') {
        console.warn('Valore di cancellazione non valido:', deleteValue);
        return null;
    }

    const [sourcePlaceName, targetPlaceName] = deleteValue.split('.');
    if (!sourcePlaceName || !targetPlaceName) {
        console.warn('Formato del valore di cancellazione non valido:', deleteValue);
        return null;
    }

    const places = spaceModeler._places.get('Elements').filter(e => is(e, 'space:Place'));
    const connections = spaceModeler._places.get('Elements').filter(e => is(e, 'space:Transition'));

    const sourcePlace = places.find(place => place.name === sourcePlaceName);
    const targetPlace = places.find(place => place.name === targetPlaceName);

    if (sourcePlace && targetPlace) {
        return connections.find(connection =>
            connection.sourcePlace.name === sourcePlace.name && connection.targetPlace.name === targetPlace.name
        );
    } else {
        console.warn(`Posto di origine o di destinazione non trovato: ${sourcePlaceName}, ${targetPlaceName}`);
        return null;
    }
}

function updatePlaceAssignmentWithElement(element, place, spaceModeler) {
    if (!element.businessObject || !element.businessObject.assignment) {
        return;
    }

    const elementAssignmentObj = parseElementAssignment(element.businessObject.assignment);
    const placeAssignmentOlcObj = parseAssignmentOlc(place.assignmentOlc);

    if (elementAssignmentObj["delete"]) {
        elementAssignmentObj["delete"].forEach(deleteValue => {
            const connectionToDelete = findTransitionByName(deleteValue, spaceModeler);
            if (connectionToDelete) {
                const canvas = spaceModeler._canvaspace.canvas;
                canvas.removeConnection(connectionToDelete);
                canvas._elementRegistry.remove(connectionToDelete);
            }
        });
    }

    if (elementAssignmentObj[place.name]) {
        const elementPlaceAssignments = elementAssignmentObj[place.name];
        for (let key in elementPlaceAssignments) {
            placeAssignmentOlcObj[key] = elementPlaceAssignments[key];
        }
    }

    place.assignmentOlc = Object.entries(placeAssignmentOlcObj)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
}

// function getValidityGuard(element, places) {
//     const placeList = places.filter(el => is(el, 'space:Place'));
//     const placesAdmitted = [];
//     const guardNot = element.businessObject.guard.startsWith("not in");
//     const guardString = guardNot ? element.businessObject.guard.slice(7, -1) : element.businessObject.guard.slice(3, -1);
//     const guardArray = guardString.split(",");
//
//     if (guardNot) {
//         return placeList.filter(place => !guardArray.includes(place.name));
//     } else {
//         return placeList.filter(place => guardArray.includes(place.name));
//     }
// }

export default {
    parseAssignmentOlc,
    parseElementAssignment,
    findPlaceByName,
    parseDataObjectAssignments,
    parseActivityAssignment,
    findTransitionByName,
    updatePlaceAssignmentWithElement,
    //getValidityGuard
};
