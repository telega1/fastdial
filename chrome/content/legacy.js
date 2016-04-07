fastdial.Legacy = new function() {
    this.migrate = function() {
        var previousVersion = fastdial.Prefs.getString("version");
        var version = "4.14.5";
        fastdial.Prefs.setString("version", version);
        if (version != previousVersion) 
                                initThemes();
    }

    function initThemes() {
        var dir = fastdial.File.getExtensionDirectory();
        dir.append("chrome");
        dir.append("skin");
        dir.append("themes");
        fastdial.File.forEachFile(dir, fastdial.Theme.import);
    }
}
