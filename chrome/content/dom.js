fastdial.Dom = {
    regexp: function(aClass) {
        return new RegExp("\\b" + aClass + "\\b");
    },

    forEach: function(element, onElement) {
        var elements = [ element ];
        while (element = elements.shift()) {
            if (onElement(element)) return element;
            for (var i = 0; i < element.childNodes.length; i++) {
                elements.push(element.childNodes[i]);
            }
        }
        return null;
    },

    is: function(element, classOrType) {
        return element.nodeName.toLowerCase() == classOrType ||
                      this.regexp(classOrType).test(element.className);
    },

    get: function(id) {
        return document.getElementById(id);
    },

    child: function(element, classOrType) {
        var self = this;
        return this.forEach(element, function(element) {
            return self.is(element, classOrType);
        });
    },

    parent: function(element, classOrType) {
        while (element = element.parentNode) {
            if (this.is(element, classOrType)) return element;
        }
        return null;
    },

    prepend: function(parent, child) {
        parent.insertBefore(child, parent.firstChild);
    },

    addClass: function(element, aClass) {
        if (!this.regexp(aClass).test(element.className)) {
            element.className += " " + aClass;
        }
    },

    removeClass: function(element, aClass) {
        var regexp = this.regexp("\s?" + aClass);
        element.className = element.className.replace(regexp, "");
    },

    remove: function(element) {
        element.parentNode.removeChild(element);
    },

    clear: function(element) {
        for (var i = element.childNodes.length - 1; i >= 0; i--) {
            element.removeChild(element.childNodes[i]);
        }
    },

    parse: function(html) {
        var range = document.createRange();
        range.selectNode(document.documentElement);
        var fragment = range.createContextualFragment(html);
        return fragment.childNodes.length > 1 ? fragment : fragment.firstChild;
    },

    css: function(element, name) {
        try {
            var doc = element.ownerDocument;
            var style = doc.defaultView.getComputedStyle(element, "");
            return style.getPropertyValue(name);
        }
        catch(e) {}
    },

    position: function(element) {
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
}
