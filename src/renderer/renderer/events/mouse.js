var Options = require("../../../utils/options.js");

var OPTION_MOUSEMOVE_PICKING = "renderer-mousemove-picking";
var OPTION_MOVEMENT_AWARE_CLICK_HANDLER = "renderer-movement-aware-click-handler";
Options.register(OPTION_MOUSEMOVE_PICKING, true);
Options.register(OPTION_MOVEMENT_AWARE_CLICK_HANDLER, false);

var EVENTS = ["click", "dblclick", "mousedown", "mouseup", "mouseover", "mousemove", "mouseout", "wheel"];

/**
 *
 * @param {Element} defaultTarget
 * @param {AbstractCanvasHandler} canvasHandler
 * @constructor
 */
var MouseEventHandler = function(defaultTarget, canvasHandler) {
    this._defaultTarget = defaultTarget;
    this._canvasHandler = canvasHandler;
    this._lastMousePosition =  {x: 0, y: 0};
};

var supportsEventConstructors = (function() {
    try {
        new MouseEvent("click", {});
        return true;
    } catch (e){
        return false;
    }
})();

MouseEventHandler.prototype =  {

    /**
     * @param {MouseEvent} event  The original event
     * @param {Element} target  target to dispatch on
     * @param {object?}     opt    Options
     */
    dispatchMouseEvent: function (event, target, opt) {
        opt = opt || {};
        target = target || this._defaultTarget;
        var x = opt.x !== undefined ? opt.x : event.clientX;
        var y = opt.y !== undefined ? opt.y : event.clientY;
        var noCopy = opt.noCopy || false;
        // Copy event to avoid DOM dispatch errors (cannot dispatch event more
        // than once)
        if (!noCopy) {
            event = this.copyMouseEvent(event);
        }
        this.initExtendedMouseEvent(event, x, y);

        target.dispatchEvent(event);
    },

    /**
     * @param {MouseEvent|WheelEvent} event the event to copy
     * @return {MouseEvent} the new event
     */
    copyMouseEvent: function (event) {
        var evt;
        if (supportsEventConstructors) {
            if (event.toString() === "[object WheelEvent]") {
                evt = new WheelEvent(event.type, event);
            } else {
                evt = new MouseEvent(event.type, event);
            }
        } else {
            //These event APIs are deprecated but still required by IE, which doesn't support event constructors yet
            if (event.toString() === "[object WheelEvent]") {
                evt = document.createEvent("WheelEvent");
                evt.initWheelEvent(event.type, event.bubbles, event.cancelable, event.view, event.detail,
                    event.screenX, event.screenY, event.clientX, event.clientY, event.button, event.relatedTarget, "",
                    event.deltaX, event.deltaY, event.deltaZ, event.deltaMode);
            } else {
                evt = document.createEvent("MouseEvent");
                evt.initMouseEvent(event.type, event.bubbles, event.cancelable, event.view, event.detail,
                    event.screenX, event.screenY, event.clientX, event.clientY, event.ctrlKey, event.altKey,
                    event.shiftKey, event.metaKey, event.button, event.relatedTarget);
            }
        }
        if (event.dataTransfer)
            evt.data = {url: event.dataTransfer.getData("URL"), text: event.dataTransfer.getData("Text")};
        // override preventDefault to actually prevent the default of the original event
        evt.preventDefault = function () {
            event.preventDefault();
        };
        return evt;
    },

    createMouseEvent: function (type, opts) {
        opts = opts || {};
        var dict = {
            bubbles		: opts.bubbles !== undefined ? opts.bubbles : true,
            cancelable 	: opts.cancelable !== undefined ? opts.cancelable : true,
            view 		: opts.view || window,
            detail 		: opts.detail !== undefined ? opts.detail : 0,
            screenX		: opts.screenX !== undefined ? opts.screenX : 0,
            screenY		: opts.screenY !== undefined ? opts.screenY : 0,
            clientX		: opts.clientX !== undefined ? opts.clientX : 0,
            clientY		: opts.clientY !== undefined ? opts.clientY : 0,
            ctrl 		: opts.ctrl !== undefined ? opts.ctrl : false,
            alt 		: opts.alt !== undefined ? opts.alt : false,
            shift 		: opts.shift !== undefined ? opts.shift : false,
            meta 		: opts.meta !== undefined ? opts.meta : false,
            button 		: opts.button !== undefined ? opts.button : 0,
            relatedTarget : opts.relatedTarget
        };
        if (supportsEventConstructors) {
            return new MouseEvent(type, dict);
        } else {
            var evt = document.createEvent("MouseEvent");
            evt.initMouseEvent(type, dict.bubbles, dict.cancelable, dict.view, dict.detail,
                dict.screenX, dict.screenY, dict.clientX, dict.clientY, dict.ctrlKey, dict.altKey,
                dict.shiftKey, dict.metaKey, dict.button, dict.relatedTarget);
            return evt;
        }
    },

    /**
     * Adds position and normal attributes to the given event.
     *
     * @param {Event} event
     * @param {number} x
     * @param {number} y
     * @return {XML3D.math.vec3}
     */
    initExtendedMouseEvent: function (event, x, y) {
        var handler = this._canvasHandler;

        (function () {
            var cachedPosition = undefined;
            var cachedNormal = undefined;

            event.__defineGetter__("normal", function () {
                if (!cachedNormal) {
                    var norm = (handler.getWorldSpaceNormalByPoint(x, y));
                    cachedNormal = norm || null;
                }
                return cachedNormal;
            });
            event.__defineGetter__("position", function () {
                if (!cachedPosition) {
                    var pos = handler.getWorldSpacePositionByPoint(x, y);
                    cachedPosition = pos || null;
                }
                return cachedPosition;
            });
        })();
    },

    /**
     * @param {MouseEvent} evt
     * @param {object?} opt
     */
    dispatchMouseEventOnPickedObject: function (evt, opt) {
        opt = opt || {};
        var pos = this.getMousePosition(evt);

        var picked = null;
        if (!opt.omitUpdate)
            picked = this._canvasHandler.getPickObjectByPoint(pos.x, pos.y);

        this.dispatchMouseEvent(evt, picked && picked.node, pos);
    },

    getMousePosition: function (evt) {
        return this._canvasHandler.getMousePosition(evt)
    },


    /**
     * @param {MouseEvent} evt
     */
    mouseup: function (evt) {
        this.dispatchMouseEventOnPickedObject(evt);
    },

    /**
     * @param {MouseEvent} evt
     */
    mousedown: function (evt) {
        this._lastMousePosition = this.getMousePosition(evt);
        this.dispatchMouseEventOnPickedObject(evt);
    },


    /**
     * @param {MouseEvent} evt
     */
    click: function (evt) {
        if (Options.getValue("renderer-movement-aware-click-handler") === true) {
            var pos = this.getMousePosition(evt);
            if (Math.abs(pos.x - this._lastMousePosition.x) > 4 || Math.abs(pos.y - this._lastMousePosition.y) > 4)
                return;
        }
        this.dispatchMouseEventOnPickedObject(evt);
    },

    /**
     * @param {MouseEvent} evt
     */
    dblclick: function (evt) {
        this.dispatchMouseEventOnPickedObject(evt);
    },

    /**
     * This method is called each time a mouseMove event is triggered on the
     * canvas.
     *
     * This method also triggers mouseover and mouseout events of objects in the
     * scene.
     *
     * @param {MouseEvent} evt
     */
    mousemove: function (evt) {
        var pos = this.getMousePosition(evt);

        var doMouseMovePick = Options.getValue(OPTION_MOUSEMOVE_PICKING);

        this.dispatchMouseEventOnPickedObject(evt, {omitUpdate: !doMouseMovePick});
        if (!doMouseMovePick)
            return;

        var curObj = this._canvasHandler.getPickedObject();

        // trigger mouseover and mouseout
        if (curObj !== this.lastPickObj) {
            if (this.lastPickObj) {
                // The mouse has left the last object
                this.dispatchMouseEvent(this.createMouseEvent("mouseout", {
                    clientX: pos.x, clientY: pos.y, button: evt.button
                }), this.lastPickObj);
                if (!curObj) { // Nothing picked, this means we enter the xml3d canvas
                    this.dispatchMouseEvent(this.createMouseEvent("mouseover", {
                        clientX: pos.x, clientY: pos.y, button: evt.button
                    }), this._defaultTarget);
                }
            }
            if (curObj) {
                // The mouse is now over a different object, so call the new
                // object's mouseover method
                this.dispatchMouseEvent(this.createMouseEvent("mouseover", {
                    clientX: pos.x, clientY: pos.y, button: evt.button
                }), curObj);
                if (!this.lastPickObj) { // Nothing was picked before, this means we leave the xml3d canvas
                    this.dispatchMouseEvent(this.createMouseEvent("mouseout", {
                        clientX: pos.x, clientY: pos.y, button: evt.button
                    }), this._defaultTarget);
                }
            }

            this.lastPickObj = curObj;
        }
    },

    /**
     * @param {MouseEvent} evt
     */
    mouseout: function (evt) {
        var pos = this.getMousePosition(evt);
        this.dispatchMouseEvent(evt, this.lastPickObj, pos);
    },

    /**
     * @param {MouseEvent} evt
     */
    mouseover: function (evt) {
        var doMouseMovePick = Options.getValue(OPTION_MOUSEMOVE_PICKING);
        this.dispatchMouseEventOnPickedObject(evt, {omitUpdate: !doMouseMovePick});
    },

    /**
     * @param {WheelEvent} evt
     */
    wheel: function (evt) {
        this.dispatchMouseEventOnPickedObject(evt, { type: "wheel" });
    }


};

module.exports = {
    EVENTS: EVENTS, MouseEventHandler: MouseEventHandler
};
