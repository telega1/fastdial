function FdThumbnail(properties) {
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
                ? !this.properties.logo
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
    this.save = function() {
        FdStorage.saveItem(this.properties);
    };
    this.open = function(where) {
        this.properties.loadInSidebar
            ? wnd.openWebPanel(this.properties.title, this.properties.url)
            : FdUtils.openLink(this.getURL(), where);
    };
    this.openAll = function() {
        var children = FdStorage.getItems(this.properties.id);
        for (var i in children) {
            var child = children[i];
            if (child.loadInSidebar) {
                wnd.openWebPanel(child.title, child.url);
            }
            else if (!child.isFolder) {
                FdUtils.openLink(child.url, "tabshifted");
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
        if (this.properties.isBack ||
                confirm && !confirmRemove.call(this)) return false;

        if (this.properties.isFolder) {
          var children = FdStorage.getItems(this.properties.id);
          for(var i in children) {
            var thumbnail = new FdThumbnail(children[i]);
            thumbnail.remove();
          }
        }
        var snapshot = this.getSnapshotURL();
        wnd.FdLoader.stop(snapshot);
        FdCache.remove(snapshot, "preview");
        FdCache.remove(snapshot);
        FdStorage.removeItem(this.properties.id);
        wnd.Fd.updateView();
        return true;
    };
    this.refresh = function() {
        if (!this.properties.isBack) {
            wnd.FdSnapshot.create(this.properties);
            wnd.Fd.updateView();
        }
    };
    this.openProperties = function() {
        if (!this.properties.isBack) {
            openDialog("chrome://fastdial/content/thumbnail/properties.xul", "properties",
                    "chrome,centerscreen,toolbar", this.properties);
        }
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
