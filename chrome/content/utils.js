var fastdial = {};

fastdial.Info = {
    URI: "chrome://fastdial/content/fastdial.html",
    NAME: "Fast Dial",
    ID: "fastdial",
}

fastdial.Utils = {
    pad: function(number) {
        return (number < 10) ? "0" + number : number;
    },

    time: function(millis) {
        if (millis) {
            var date = new Date(millis);
            return this.pad(date.getHours()) + ":" +
                   this.pad(date.getMinutes());
        } else {
            return "";
        }
    },

    getQueryParams: function(url) {
        var params = new Array();
        var regexp = /[?&](\w+)=(\w+)/g;
        var match;
        while ((match = regexp.exec(url)) != null) {
            params[match[1]] = match[2];
        }
        return params;
    },

    clone: function(object) {
        return this.merge({}, object);
    },

    merge: function(target) {
        if (!target) target = new Object();
        for (var j = 1; j < arguments.length; j++) {
            var source = arguments[j];
            for (var i in source) {
                if (source[i] == null) continue;
                switch (typeof source[i]) {
                    case "string":
                    case "number":
                    case "boolean":
                    case "function":
                        target[i] = source[i];
                        break;
                    default:
                        target[i] = this.merge(target[i], source[i]);
                        break;
                }
            }
        }
        return target;
    },

    confirm: function(message) {
        var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                .getService(Components.interfaces.nsIPromptService);
        return prompts.confirm(window, fastdial.Info.NAME, message);
    },

    prompt: function(message, value) {
        var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                .getService(Components.interfaces.nsIPromptService);
        return prompts.prompt(window, fastdial.Info.NAME, message, value, null, { value: false });
    },

    getBrowserWindow: function() {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                .getService(Components.interfaces.nsIWindowMediator);
        return wm.getMostRecentWindow("navigator:browser");
    },

    selectItem: function(menulistId, value) {
        var menulist = document.getElementById(menulistId);
        var popup = menulist.menupopup;
        for (var i = 0; i < popup.childNodes.length; i++) {
            if (popup.childNodes[i].label == value ||
                    popup.childNodes[i].value == value) return menulist.selectedIndex = i;
        }
        menulist.selectedIndex = 0;
    },

    getFontList: function() {
        var enumerator = Components.classes["@mozilla.org/gfx/fontenumerator;1"]
                .getService(Components.interfaces.nsIFontEnumerator);
        var count = {};
        return enumerator.EnumerateAllFonts(count);
    },

    openLink: function(url, where) {
        var wnd = this.getBrowserWindow();
        if (where instanceof Event) {
            where = wnd.whereToOpenLink(where);
        }
        switch (where) {
            case "tabshifted":
                return wnd.gBrowser.addTab(url);
            case "tab":
                return wnd.gBrowser.selectedTab = wnd.gBrowser.addTab(url);
            case "window":
                return wnd.open(url);
            default:
                return wnd.loadURI(url);
        }
    },

    toJSON: function(object) {
       return JSON.stringify(object);
    },

    fromJSON: function(string) {
        try {
            return JSON.parse(string);
        }
        catch(e) {}
    },

    md5: function(string) {
        if (!string) return "";
        // Build array of character codes to MD5
        var array = new Array();
        for (var i = 0; i < string.length; i++) {
            array.push(string.charCodeAt(i));
        }
        var hash = Components.classes["@mozilla.org/security/hash;1"]
                              .createInstance(Components.interfaces.nsICryptoHash);
        hash.init(hash.MD5);
        hash.update(array, array.length);
        var binary = hash.finish(false);
        // Unpack the binary data bin2hex style
        var result = "";
        for (var i = 0; i < binary.length; ++i) {
            var c = binary.charCodeAt(i);
            var ones = c % 16;
            var tens = c >> 4;
            result += String.fromCharCode(tens + (tens > 9 ? 87 : 48)) +
                      String.fromCharCode(ones + (ones > 9 ? 87 : 48));
        }
        return result;
    },

    getShortcutKey: function(event) {
        var value = "";
        if (!event.charCode) return value;
        if (event.ctrlKey) value += "Ctrl + ";
        if (event.altKey) value += "Alt + ";
        if (event.shiftKey) value += "Shift + ";
        value += String.fromCharCode(event.charCode).toUpperCase();
        return value;
    },

    getSearchEngines: function() {
        var searchService = Components.classes["@mozilla.org/browser/search-service;1"]
                  .getService(Components.interfaces.nsIBrowserSearchService);
        return searchService.getVisibleEngines({});
    },

    getSearchEngine: function(name) {
        var searchService = Components.classes["@mozilla.org/browser/search-service;1"]
                .getService(Components.interfaces.nsIBrowserSearchService);
        return name ? searchService.getEngineByName(name)
                    : searchService.currentEngine;
    },

    encode: function(str) {
        return encodeURIComponent(str).replace(/[!'()]/g, escape).replace(/\*/g, "%2A");
    },

    decode: function(str) {
        try {
            return decodeURI(str);
        }
        catch(e) {
            return str;
        }
    }
}

fastdial.Bundle = {
    bundle: Components.classes["@mozilla.org/intl/stringbundle;1"]
            .getService(Components.interfaces.nsIStringBundleService)
            .createBundle("chrome://fastdial/locale/fastdial.properties"),

    getString: function(name, params) {
        try {
            return params ? this.bundle.formatStringFromName(name, params, params.length)
                          : this.bundle.GetStringFromName(name);
        } catch(e) {
            return null;
        }
    }
}
