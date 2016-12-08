fastdial.Storage = new function() {
    var self = this;

    this.FOLDER_ICON = "chrome://fastdial/skin/icons/folder.png";
    this.SHORTCUT_KEY = "fastdial/shortcutKey";
    this.REFRESH = "fastdial/refresh";

    this.getFolderURL = function(id) {
        if (id) return fastdial.Info.URI + "?folder=" + id;
        return null;
    };
    this.getURL = function(item) {
        return item.id && item.isFolder
                ? this.getFolderURL(item.id) : item.url;
    };
    this.getHome = function() {
        var home = fastdial.Bookmark.getHome();
        getProperties(home);
        return home;
    };
    function getProperties(bookmark) {
        var annotation = fastdial.Bookmark.getAnnotation(bookmark.id, fastdial.Info.ID);
        fastdial.Utils.merge(bookmark, fastdial.Utils.fromJSON(annotation));
        bookmark.shortcutKey = fastdial.Bookmark.getAnnotation(bookmark.id, self.SHORTCUT_KEY);
        bookmark.refresh = fastdial.Bookmark.getAnnotation(bookmark.id, self.REFRESH);
    }

    function saveProperties(item) {
        if (item.id == -1) return;
        var annotation = fastdial.Utils.clone(item);
        var exclude = ["id", "folderId", "isFolder", "url", "title", "index",
                       "description", "shortcutKey", "refresh", "loadInSidebar"];
        for (var i in exclude) {
            delete annotation[exclude[i]];
        }
        fastdial.Bookmark.setAnnotation(item.id, fastdial.Info.ID, fastdial.Utils.toJSON(annotation));
        fastdial.Bookmark.setAnnotation(item.id, self.SHORTCUT_KEY, item.shortcutKey);
        fastdial.Bookmark.setAnnotation(item.id, self.REFRESH, item.refresh);
    }

    this.getItem = function(id) {
        var bookmark = fastdial.Bookmark.getBookmark(id);
        getProperties(bookmark);
        return bookmark;
    };
    this.getItems = function(folderId, order, maxResults) {
        var sort = order == "title" ? fastdial.Bookmark.SORT_TITLE :
                   order == "visits" ? fastdial.Bookmark.SORT_VISITS : 0;
        var items = [];
        var bookmarks = fastdial.Bookmark.getBookmarks(folderId, sort, maxResults);
        for (var i = 0; i < bookmarks.length; i++) {
            var bookmark = bookmarks[i];
            getProperties(bookmark);
            if (order) items.push(bookmark);
            else {
                if (isNaN(parseInt(bookmark.thumbIndex)) || items[bookmark.thumbIndex]) {
                    bookmark.thumbIndex = getFreeIndex(items);
                    if (bookmark.folderId != -1) saveProperties(bookmark);
                }
                items[bookmark.thumbIndex] = bookmark;
            }
        }
        return items;
    };
    function getFreeIndex(items) {
        for (var i = 0; ; i++) {
            if (!items[i]) return i;
        }
    }

    this.saveItem = function(item) {
        fastdial.Bookmark.saveBookmark(item);
        saveProperties(item);
    };
    this.removeItem = function(id) {
        fastdial.Bookmark.removeAnnotation(id, this.SHORTCUT_KEY);
        fastdial.Bookmark.removeAnnotation(id, this.REFRESH);
        fastdial.Bookmark.removeAnnotation(id, fastdial.Info.ID);
        fastdial.Bookmark.removeBookmark(id);
    };
    this.getAnnotatedItems = function(annotation) {
        var items = [];
        var ids = fastdial.Bookmark.getAnnotatedIds(annotation);
        for (var i in ids) {
            var item = this.getItem(ids[i]);
            items.push(item);
        }
        return items;
    };

    function exportFolder(folder, tempDir) {
        var data = []; 
        var children = fastdial.Storage.getItems(folder.id);

        for(var i in children) {
            var child = children[i];
            if (child.logo) {
                try {
                    var nsiUrl = fastdial.URL.getNsiURL(child.logo);
                    if (nsiUrl.schemeIs("file")) {
                        var file = fastdial.File.getFileFromURL(nsiUrl.spec);
                        file.copyTo(tempDir, file.leafName);
                    }
                } catch(e) {}
            }
            var item = {
                "isFolder": child.isFolder,
                "title": child.title,
                "url": child.url,
                "description": child.description,
                "logo": child.logo,
                "thumbIndex": child.thumbIndex,
                "shortcutKey": child.shortcutKey,
                "refresh": child.refresh,
                "refreshAll": child.refreshAll,
                "preview": child.preview,
                "loadInSidebar": child.loadInSidebar
            }
            if (child.isFolder) {
                item.children = exportFolder(child, tempDir);
            }
            data.push(item);
        }
        return data;
    }
    
    this.export = function(folder) {
        var zipFile = fastdial.File.chooseFile("save", ["*.zip"]);
        if (!zipFile) return;
        if (!zipFile.leafName.match(/\.zip$/)) {
            zipFile.leafName += ".zip";
        }
        var tempDir = fastdial.File.createTempDirectory();
        var data = exportFolder(folder, tempDir);

        var json = fastdial.Utils.toJSON(data);
        var jsonFile = tempDir.clone();
        jsonFile.append("fastdial.json");
        fastdial.File.writeFile(jsonFile, json);
        fastdial.File.zip(zipFile, tempDir);
        tempDir.remove(true);
    }

    function importFolder(folder, children, dir) {
        for(var i in children) {
            var child = children[i];
            if (child.logo) {
                try {
                    var nsiUrl = fastdial.URL.getNsiURL(child.logo);
                    if (nsiUrl.schemeIs("file")) {
                        var fileName = fastdial.File.getFileFromURL(nsiUrl.spec).leafName;
                        var file = dir.clone();
                        file.append(fileName);
                        child.logo = fastdial.File.getFileURL(file);
                    }
                } catch(e) {}
            }         
            var item = {
                "isFolder": child.isFolder,
                "title": child.title,
                "url": child.url,
                "description": child.description,
                "logo": child.logo,
                "thumbIndex": child.thumbIndex,
                "shortcutKey": child.shortcutKey,
                "refresh": child.refresh,
                "refreshAll": child.refreshAll,
                "preview": child.preview,
                "loadInSidebar": child.loadInSidebar,
                "folderId": folder.id,
                "index": -1
            }
            fastdial.Storage.saveItem(item);
            if (item.isFolder) {
                importFolder(item, child.children, dir);
            }
       }
    }
    
    this.import = function(folder) {
        var zipFile = fastdial.File.chooseFile("open", ["*.zip"]);
        if (!zipFile) return;
        
        var dir = zipFile.clone();
        dir.leafName = dir.leafName.replace(/\.zip$/, "");
        if (!dir.exists()) fastdial.File.createDirectory(dir);
        fastdial.File.unzip(zipFile, dir);

        var jsonFile = dir.clone();
        jsonFile.append("fastdial.json");
        var json = fastdial.File.readFile(jsonFile);
        var children = fastdial.Utils.fromJSON(json);
        importFolder(folder, children, dir);
    }
}
