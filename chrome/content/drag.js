fastdial.Drag = new function() {
    const MIN_DRAG = 10;
    var click, delta;
    var source, object;
    var disabled;
    this.draggable = function(element) {
        element.addEventListener("mousedown", onMouseDown, false);
        document.addEventListener("mousemove", onMouseMove, false);
        document.addEventListener("mouseup", onMouseUp, false);
    }
    this.disable = function() {
        disabled = true;
        stop();
    }
    this.enable = function() {
        disabled = false;
    }
    this.inProgress = function() {
        return object;
    }
    function getAbsolutePosition(element) {
        var position = {
            left: 0,
            top: 0
        };
        while (element) {
            position.left += element.offsetLeft;
            position.top += element.offsetTop;
            element = element.offsetParent;
        }
        return position;
    }

    function onMouseDown(e) {
        if (e.button != 0) return;
        source = e.currentTarget;
        click = {
            x: e.pageX,
            y: e.pageY
        };
        var position = getAbsolutePosition(source);
        delta = {
            x: e.pageX - position.left,
            y: e.pageY - position.top
        }
        e.preventDefault();
    }

    function onMouseUp(e) {
        if (object) {
            var event = document.createEvent("MouseEvents");
            event.initMouseEvent("drop", e.bubbles, e.cancelable, e.view, e.detail,
                    e.screenX, e.screenY, e.clientX, e.clientY,
                    e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.button, null);
            document.dispatchEvent(event);
        }
        stop();
    }

    function onMouseMove(e) {
        if (!disabled && source && !object &&
                Math.abs(click.x - e.pageX) +
                        Math.abs(click.y - e.pageY) > MIN_DRAG) start();
        if (object) {
            object.style.left = e.pageX - delta.x;
            object.style.top = e.pageY - delta.y;
        }
    }

    function start() {
        object = document.createElement("div");
        object.style.width = source.offsetWidth;
        object.style.height = source.offsetHeight;
        object.style.cursor = "move";
        object.style.position = "absolute";
        object.style.border = "1px gray dashed";
        document.documentElement.appendChild(object);
    }

    function stop() {
        if (object) {
            fastdial.Dom.remove(object);
            object = null;
        }
        if (source) {
            source.removeEventListener("mousedown", onMouseDown, false);
            document.removeEventListener("mousemove", onMouseMove, false);
            document.removeEventListener("mouseup", onMouseUp, false);
            source = null;
        }
    }
}
