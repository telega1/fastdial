fastdial.Legacy = new function() {
    this.migrate = function() {
        var previousVersion = fastdial.Prefs.getString("version");
        var version = "4.12";
        fastdial.Prefs.setString("version", version);

        if (!previousVersion) addToolbarButton();
        if (version != previousVersion) initThemes();
    }
    function isOlder(version1, version2) {
        if (!version1) return false;
        var parts1 = version1.split(/[^\d]+/);
        var parts2 = version2.split(/[^\d]+/);
        for (var i = 0; i < parts1.length; i++) {
            var v1 = parseInt(parts1[i]);
            var v2 = parseInt(parts2[i]);
            if (v1 != v2)
                return v1 < v2;
        }
    }

    function addToolbarButton() {
        var navbar = document.getElementById("nav-bar");
        var currentSet = navbar.currentSet;
        if (!currentSet.match("fd-button")) {
            currentSet = currentSet.replace(/urlbar-container/,
                    "fd-button,urlbar-container");
            navbar.setAttribute("currentset", currentSet);
            document.persist("nav-bar", "currentset");
        }
    }

    function initThemes() {
        var dir = fastdial.File.getExtensionDirectory();
        dir.append("chrome");
        dir.append("skin");
        dir.append("themes");
        fastdial.File.forEachFile(dir, fastdial.Theme.import);
    }
}
