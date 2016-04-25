fastdial.Storage = new function() {
    var self = this;

    this.FOLDER_LOGO = "chrome://fastdial/skin/images/folder.png";
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
    this.export = function(folder) {
        var file = fastdial.File.chooseFile("save", ["*.json"]);
        if (!file) return;
        if (!file.leafName.match(/\.json$/)) {
            file.leafName += ".json";
        }
        var data = []; 
        var children = fastdial.Storage.getItems(folder.id);

        for(var i in children) {
            var child = children[i];
            if (child.isFolder) continue;
            data.push({
                "title": child.title,
                "url": child.url,
                "description": child.description,
                "logo": child.logo
            });
       }
       var json = fastdial.Utils.toJSON(data);
       fastdial.File.writeFile(file, json);
    }
    this.import = function(folder) {
        var file = fastdial.File.chooseFile("open", ["*.json"]);
        if (!file) return;

        var json = fastdial.File.readFile(file);
        var children = fastdial.Utils.fromJSON(json);

        for(var i in children) {
            var child = children[i];
            if (child.isFolder) continue;

            fastdial.Storage.saveItem({
                "title": child.title,
                "url": child.url,
                "description": child.description,
                "logo": child.logo,
                "folderId": folder.id,
                "index": -1
            });
        }
    }
}
