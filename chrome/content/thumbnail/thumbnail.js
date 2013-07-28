function FdThumbnail(properties) {
    const ICON_FOLDER = "chrome://fastdial/skin/icons/folder.png";

    this.properties = properties;
    this.getTooltip = function() {
        if (!this.properties.refresh) {
            return this.properties.description;
        }
        var time = FdCache.getCachedTime(this.getSnapshotURL());
        return FdUtils.time(time);
    };
    this.getURL = function() {
        return FdStorage.getURL(this.properties);
    };
    this.getSnapshotURL = function() {
        return this.properties.logo || this.getURL(this.properties);
    };
    this.isRefreshAll = function() {
        return this.properties.refreshAll == undefined
                ? !(this.properties.logo || this.properties.isFolder)
                : this.properties.refreshAll;
    };
    this.getImageURL = function() {
        return FdCache.getCachedURL(this.getSnapshotURL());
    };
    this.getImageFile = function() {
        return FdCache.getCachedFile(this.getSnapshotURL());
    };
    this.isLoading = function() {
        return wnd.FdLoader.isLoading(this.properties.logo) ||
                wnd.FdLoader.isLoading(this.getURL());
    };
    this.isReadOnly = function() {
        return this.properties.isBack || this.properties.id == -1;
    };
    this.save = function() {
        FdStorage.saveItem(this.properties);
    };
    this.openAll = function() {
        var children = FdStorage.getItems(this.properties.id);
        for (var i in children) {
            if (!children[i].isFolder) {
                FdUtils.openLink(children[i].url, "tabshifted");
            }
        }
    };
    function confirmRemove() {
        var title = this.properties.title;
        var message = FdBundle.getString("remove", [title]);
        if (this.properties.isFolder) {
            var children = FdStorage.getItems(this.properties.id);
            if (children.length) {
                message = FdBundle.getString("removeNonEmptyFolder", [title]);
            }
        }
        return FdUtils.confirm(message);
    }

    this.remove = function(confirm) {
        if (this.isReadOnly() ||
                confirm && !confirmRemove.call(this)) return false;

        if (this.properties.isFolder) {
          var children = FdStorage.getItems(this.properties.id);
          for(var i in children) {
            var thumbnail = new FdThumbnail(children[i]);
            thumbnail.remove(false);
          }
        }
        var url = this.getSnapshotURL();
        wnd.FdLoader.stop(url);
        FdCache.remove(url, "preview");
        FdCache.remove(url);
        FdStorage.removeItem(this.properties.id);
        wnd.Fd.updateView();
        return true;
    };
    this.refresh = function() {
        if (!this.properties.isBack) {
            var snapshot = this.getSnapshotURL();
            FdURL.removeFromCache(document, FdCache.getCachedURL(snapshot, "preview"));
            FdURL.removeFromCache(document, FdCache.getCachedURL(snapshot));
            FdCache.remove(snapshot);
            wnd.Fd.updateView();
        }
    };
    this.openProperties = function() {
        if (!this.isReadOnly()) {
            openDialog("chrome://fastdial/content/thumbnail/properties.xul", "properties",
                    "chrome,centerscreen,toolbar", this.properties);
        }
    };
    this.getFavicon = function() {
        function onIconLoad(iconURL) {
            var box = FdDom.get(properties.thumbIndex);
            if (box) {
                var span = FdDom.child(box, "span");
                var icon = document.createElement("img");
                icon.setAttribute("src", iconURL);
                FdDom.prepend(span, icon);
            }
        }
        this.properties.isFolder 
            ? onIconLoad(ICON_FOLDER) 
            : FdBookmark.getFavicon(this.getURL(), onIconLoad);
    };
}
FdThumbnail.RATIO = 0.75;
FdThumbnail.MIN_WIDTH = 100;
FdThumbnail.getHeight = function(width) {
    return Math.floor(width * FdThumbnail.RATIO);
};
FdThumbnail.getWidth = function(height) {
    return Math.floor(height / FdThumbnail.RATIO);
};
