import { GUARD_VIOLATION_EVENT, SYNTAX_VIOLATION_EVENT, NOT_REACHABLE_EVENT } from '../../util/EventHelper';

export default function ViolationNotification(eventBus, animation, elementRegistry, log, elementNotifications, canvas) {
	this._animation = animation;
	this._elementRegistry = elementRegistry;
	this._elementNotifications = elementNotifications;
	this._log = log;
	this._canvas = canvas;
	this._eventBus = eventBus;
	var self = this;

	this._eventBus.on(GUARD_VIOLATION_EVENT, function(context) {
		console.log('Handling GUARD_VIOLATION_EVENT:', context);
		self.notifyGuardViolation(context.element);
	});
	this._eventBus.on(SYNTAX_VIOLATION_EVENT, function(context) {
		console.log('Handling SYNTAX_VIOLATION_EVENT:', context);
		self.notifySyntaxViolation(context.element, context.error);
	});
	this._eventBus.on(NOT_REACHABLE_EVENT, function(context) {
		console.log('Handling NOT_REACHABLE_EVENT:', context);
		self.notifyNotReachableViolation(context.element, context.error);
	});
}

ViolationNotification.prototype.notifyGuardViolation = function(element) {
	console.log('notifyGuardViolation called for element:', element);
	if (typeof this._log.log !== 'function') {
		throw new TypeError('this._log.log is not a function');
	}
	this._log.log('violates activity guard!', 'warning', 'fa-exclamation-circle');

	this._elementNotifications.addElementNotification(element, {
		type: 'warning',
		icon: 'fa-exclamation-circle',
		text: 'violated guard!',
	});

	// ELEMENT COLOR FOR GUARD VIOLATION
	var modeling = this._canvas.get('modeling');
	modeling.setColor([element], {
		stroke: 'red',
		fill: '#ffa5a5'
	});
	console.log('Element color set for guard violation');
}

ViolationNotification.prototype.notifySyntaxViolation = function(element, error) {
	console.log('notifySyntaxViolation called for element:', element, 'with error:', error);
	if (typeof this._log.log !== 'function') {
		throw new TypeError('this._log.log is not a function');
	}
	this._log.log('syntax error!', 'warning', 'fa-exclamation-circle');

	this._elementNotifications.addElementNotification(element, {
		type: 'warning',
		icon: 'fa-exclamation-circle',
		text: 'syntax error!',
	});

	// ELEMENT COLOR FOR SYNTAX VIOLATION
	var modeling = this._canvas.get('modeling');
	modeling.setColor([element], {
		stroke: 'red',
		fill: '#ffa5a5'
	});
	console.log('Element color set for syntax violation');
}


ViolationNotification.prototype.notifyNotReachableViolation = function(element, error) {
	console.log('notifyNotReachableViolation called for element:', element, 'with error:', error);
	if (typeof this._log.log !== 'function') {
		throw new TypeError('this._log.log is not a function');
	}
	this._log.log('syntax error!', 'warning', 'fa-exclamation-circle');

	this._elementNotifications.addElementNotification(element, {
		type: 'warning',
		icon: 'fa-exclamation-circle',
		text: 'Destination not reachable!',
	});

	var modeling = this._canvas.get('modeling');
	modeling.setColor([element], {
		stroke: 'red',
		fill: '#ffa5a5'
	});
}

ViolationNotification.$inject = [
	'eventBus',
	'animation',
	'elementRegistry',
	'elementNotifications',
	'canvas',
	'log'
];
