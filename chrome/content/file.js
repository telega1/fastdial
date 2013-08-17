var FdPrefs = new function() {
    const FASTDIAL = "extensions.fastdial.";
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefBranch);
    this.getGlobalString = function(name) {
        try {
            return prefs.getComplexValue(name,
                    Components.interfaces.nsISupportsString).data;
        } catch(e) {
        }
    }
    this.setGlobalString = function(name, value) {
        var str = Components.classes["@mozilla.org/supports-string;1"]
                .createInstance(Components.interfaces.nsISupportsString);
        str.data = value;
        prefs.setComplexValue(name,
                Components.interfaces.nsISupportsString, str);
    }
    this.getGlobalBool = function(name) {
        try {
            return prefs.getBoolPref(name);
        } catch(e) {
        }
    }
    this.setGlobalBool = function(name, value) {
        prefs.setBoolPref(name, value);
    }
    this.getGlobalInt = function(name) {
        try {
            return prefs.getIntPref(name);
        } catch(e) {
        }
    }
    this.setGlobalInt = function(name, value) {
        prefs.setIntPref(name, value);
    }
    this.getString = function(name) {
        return this.getGlobalString(FASTDIAL + name);
    }
    this.setString = function(name, value) {
        this.setGlobalString(FASTDIAL + name, value);
    }
    this.getBool = function(name) {
        return this.getGlobalBool(FASTDIAL + name);
    }
    this.setBool = function(name, value) {
        this.setGlobalBool(FASTDIAL + name, value);
    }
    this.getInt = function(name) {
        return this.getGlobalInt(FASTDIAL + name);
    }
    this.setInt = function(name, value) {
        this.setGlobalInt(FASTDIAL + name, value);
    }
    this.getObject = function(name) {
        return FdUtils.fromJSON(this.getString(name)) || {};
    }
    this.setObject = function(name, value) {
        this.setString(name, FdUtils.toJSON(value));
    }
    this.clearGlobal = function(name) {
        try {
            prefs.clearUserPref(name);
        } catch(e) {}
    }
    this.clear = function(name) {
        this.clearGlobal(FASTDIAL + name);
    }
}
var FdFile = {
    RDWR_CREATE_TRUNCATE: 0x04 | 0x08 | 0x20,

    getNsiFile: function(path) {
        var file = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsIFile);
        file.initWithPath(path);
        return file;
    },

    getFileURL: function(file) {
        var ios = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
        var fileHandler = ios.getProtocolHandler("file")
                .QueryInterface(Components.interfaces.nsIFileProtocolHandler);
        return fileHandler.getURLSpecFromFile(file);
    },

    getExtensionDirectory: function() {
        var service = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);
        var dir = service.get("ProfD", Components.interfaces.nsIFile);
        dir.append("extensions");
        dir.append("fastdial@telega.phpnet.us");
        return dir;
    },

    getDataDirectory: function() {
        var dir = Components.classes["@mozilla.org/file/directory_service;1"]
                .getService(Components.interfaces.nsIProperties)
                .get("ProfD", Components.interfaces.nsIFile);
        dir.append("fastdial");
        if (!dir.exists()) {
            FdFile.createDirectory(dir);
        }
        return dir;
    },

    createDirectory: function(dir) {
        dir.create(Components.
                interfaces.nsIFile.DIRECTORY_TYPE, 0x1ff);
    },

    writeFile: function(file, data) {
        var out = Components.classes["@mozilla.org/network/file-output-stream;1"]
                .createInstance(Components.interfaces.nsIFileOutputStream);
        out.init(file, FdFile.RDWR_CREATE_TRUNCATE, 0x1b6, 0);
        out.write(data, data.length);
        out.close();
    },

    readFile: function(file) {
        var stream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                .createInstance(Components.interfaces.nsIFileInputStream);
        stream.init(file, -1, 0, 0);
        var unichar = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                .createInstance(Components.interfaces.nsIConverterInputStream);
        var data = {};
        unichar.init(stream, "utf-8", stream.available(), 0xFFFD);
        unichar.readString(stream.available(), data);
        unichar.close();
        stream.close();
        return data.value;
    },

    chooseFile: function(mode, filters, name) {
        var fp = Components.classes["@mozilla.org/filepicker;1"]
                .createInstance(Components.interfaces.nsIFilePicker);
        fp.init(window, null, mode == "save" ? fp.modeSave :
                mode == "folder" ? fp.modeGetFolder :
                        mode == "multiple" ? fp.modeOpenMultiple : fp.modeOpen);
        for (var i in filters) {
            switch (filters[i]) {
                case "images":
                    fp.appendFilters(fp.filterImages);
                    break;
                case "html":
                    fp.appendFilters(fp.filterHTML);
                    break;
                default:
                    fp.appendFilter(filters[i], filters[i]);
                    break;
            }
        }
        fp.appendFilters(fp.filterAll);
        fp.defaultString = name;
        var result = fp.show();
        if (result == fp.returnOK || result == fp.returnReplace) {
            if (mode != "multiple") return fp.file;
            var anEnum = fp.files;
            var files = [];
            while (anEnum.hasMoreElements()) {
                var file = anEnum.getNext();
                file.QueryInterface(Components.interfaces.nsIFile);
                files.push(file);
            }
            return files;
        }
    },

    forEachFile: function(dir, onFile) {
        var files = dir.directoryEntries;
        while (files.hasMoreElements()) {
            var file = files.getNext();
            file.QueryInterface(Components.interfaces.nsIFile);
            onFile(file);
        }
    },

    unzip: function(file, dir) {
        var zipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"]
                .createInstance(Components.interfaces.nsIZipReader);
        zipReader.open(file);
        var entries = zipReader.findEntries(undefined);
        while (entries.hasMore()) {
            var entry = entries.getNext();
            var target = dir.clone();
            target.append(entry);
            zipReader.extract(entry, target);
        }
        // Remove "readonly" attribute
        FdFile.forEachFile(dir, function(file) {
          file.permissions = 438;
        });
    },

    zip: function(file, dir) {
        var zipWriter = Components.classes["@mozilla.org/zipwriter;1"]
                .createInstance(Components.interfaces.nsIZipWriter);
        zipWriter.open(file, FdFile.RDWR_CREATE_TRUNCATE);
        FdFile.forEachFile(dir, function(f) {
            zipWriter.addEntryFile(f.leafName,
                    zipWriter.COMPRESSION_DEFAULT, f, false);
        });
        zipWriter.close();
    }
}
var FdURL = {
    getNsiURL: function(url) {
        var nsiUrl = Components.classes["@mozilla.org/network/standard-url;1"]
                .createInstance(Components.interfaces.nsIURL);
        nsiUrl.spec = url;
        return nsiUrl;
    },

    getNsiURI: function(uri) {
        var nsiUri = Components.classes["@mozilla.org/network/simple-uri;1"]
                .createInstance(Components.interfaces.nsIURI);
        nsiUri.spec = uri;
        return nsiUri;
    },

    getScheme: function(url) {
        if (url) {
            return FdURL.getNsiURL(url).scheme;
        }
    },

    isLocal: function(url) {
        return /^(chrome:|file:)/.test(url);
    },

    readURL: function(url) {
        var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
        var channel = ioService.newChannel(url, null, null);
        var stream = channel.open();
        var binary = Components.classes["@mozilla.org/binaryinputstream;1"]
                .createInstance(Components.interfaces.nsIBinaryInputStream);
        binary.setInputStream(stream);
        var size, data = "";
        while ((size = binary.available()) != 0) {
            data += binary.readBytes(size);
        }
        binary.close();
        stream.close();
        return data;
    },

    removeFromCache: function(doc, url) {
        var uri = FdURL.getNsiURI(url);
        try {
            var tools = Components.classes["@mozilla.org/image/tools;1"]
                                  .getService(Components.interfaces.imgITools);
            var cache = tools.getImgCacheForDocument(doc);
            cache.removeEntry(uri);
        }
        catch(e) {}
    }
}
var FdCache = {
    getDirectory: function(folder) {
        var dir = FdFile.getDataDirectory();
        dir.append("cache");
        if (folder) {
            dir.append(folder);
        }
        if (!dir.exists()) {
            FdFile.createDirectory(dir);
        }
        return dir;
    },

    getCachedName: function(url) {
        if (url) return FdUtils.md5(url);
        return null;
    },

    getCachedURL: function(url, folder) {
        var name = FdCache.getCachedName(url);
        if (!name) return null;
        var cacheUrl = "chrome://fastdial-profile/content/cache/";
        if (folder) cacheUrl += folder + "/";
        return cacheUrl + name;
    },

    // Folder parameter is optional

    getCachedFile: function(url, folder) {
        var name = FdCache.getCachedName(url);
        if (!name) return null;
        var file = FdCache.getDirectory(folder);
        file.append(name);
        return file;
    },

    getCachedTime: function(url, folder) {
        try {
            var file = FdCache.getCachedFile(url, folder);
            return file.lastModifiedTime;
        }
        catch(e) {
        }
    },

    save: function(url, data, folder) {
        var file = FdCache.getCachedFile(url, folder);
        FdFile.writeFile(file, data || FdURL.readURL(url));
    },

    remove: function(url, folder) {
        var file = FdCache.getCachedFile(url, folder);
        try {
            file.remove(false);
            var cached = FdCache.getCachedURL(url, folder);
            FdUtils.forEachTab(function(wnd) {
                FdURL.removeFromCache(
                           wnd.document, cached);
            });
        }
        catch(e) {}
    }
}
var FdTheme = {
    getDirectory: function(name) {
        var dir = FdFile.getDataDirectory();
        dir.append("themes");
        if (name) {
            dir.append(name);
        }
        if (!dir.exists()) {
            FdFile.createDirectory(dir);
        }
        return dir;
    },

    remove: function(name) {
        if (!name) return;
        var dir = FdTheme.getDirectory(name);
        try {
            dir.remove(true);
        }
        catch(e) {
        }
    },

    copy: function(source, target) {
        FdTheme.remove(target);
        if (source) {
            var dir = FdTheme.getDirectory(source);
            dir.copyTo(dir.parent, target);
        }
    },

    getTitle: function(name) {
        var file = FdTheme.getDirectory(name);
        file.append("style.css");
        try {
            var content = FdFile.readFile(file);
            var title = /@title (.*)/.exec(content);
            if (title) return title[1];
        }
        catch(e) {
        }
        return null;
    },

    getInfos: function() {
        var infos = [];
        var dir = FdTheme.getDirectory();
        FdFile.forEachFile(dir, function(file) {
            var name = file.leafName;
            if (name == "current") return;
            var title = FdTheme.getTitle(name) || name.replace(/^~/, "");
            if (/^~/.test(name)) title = "*" + title;
            infos.push({
                name: name,
                title: title || name
            });
        });
        return infos.sort(function(a, b) {
            return a.title.toLowerCase() > b.title.toLowerCase();
        });
    },

    setStyle: function(style) {
        var file = FdTheme.getDirectory("current");
        file.append("style.css");
        FdFile.writeFile(file, style);
    },

    import: function(file) {
        var name = file.leafName;
        FdTheme.remove(name);
        var theme = FdTheme.getDirectory(name);
        FdFile.unzip(file, theme);
    }
};
