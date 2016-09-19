fastdial.Thumbnail = function(properties) {
    this.properties = properties;

    this.getTooltip = function() {
        if (!this.properties.refresh) {
            return this.properties.description;
        }
        var time = fastdial.Cache.getCachedTime(this.getSnapshotURL());
        return fastdial.Utils.time(time);
    };
    this.getURL = function() {
        return fastdial.Storage.getURL(this.properties);
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
        var snapshot = this.getSnapshotURL();
        var time = fastdial.Cache.getCachedTime(snapshot);
        return fastdial.Cache.getCachedURL(snapshot) + "?" + time;
    };
    this.getImageFile = function() {
        return fastdial.Cache.getCachedFile(this.getSnapshotURL());
    };
    this.isLoading = function() {
        return wnd.fastdial.Loader.isLoading(this.properties.logo) ||
                wnd.fastdial.Loader.isLoading(this.getURL());
    };
    this.save = function() {
        fastdial.Storage.saveItem(this.properties);
    };
    this.open = function(where) {
        this.properties.loadInSidebar
            ? wnd.openWebPanel(this.properties.title, this.properties.url)
            : fastdial.Utils.openLink(this.getURL(), where);
    };
    this.openAll = function() {
        var children = fastdial.Storage.getItems(this.properties.id);
        for (var i in children) {
            var child = children[i];
            if (child.loadInSidebar) {
                wnd.openWebPanel(child.title, child.url);
            }
            else if (!child.isFolder) {
                fastdial.Utils.openLink(child.url, "tabshifted");
            }
        }
    };
    function confirmRemove() {
        var title = this.properties.title;
        var message = fastdial.Bundle.getString("remove", [title]);
        if (this.properties.isFolder) {
            var children = fastdial.Storage.getItems(this.properties.id);
            if (children.length) {
                message = fastdial.Bundle.getString("removeNonEmptyFolder", [title]);
            }
        }
        return fastdial.Utils.confirm(message);
    }

    this.remove = function(confirm) {
        if (this.properties.isBack ||
                confirm && !confirmRemove.call(this)) return false;

        if (this.properties.isFolder) {
          var children = fastdial.Storage.getItems(this.properties.id);
          for(var i in children) {
            var thumbnail = new fastdial.Thumbnail(children[i]);
            thumbnail.remove();
          }
        }
        var snapshot = this.getSnapshotURL();
        wnd.fastdial.Loader.stop(snapshot);
        fastdial.Cache.remove(snapshot, "preview");
        fastdial.Cache.remove(snapshot);
        fastdial.Storage.removeItem(this.properties.id);
        wnd.fastdial.Overlay.updateView();
        return true;
    };

    this.openPreview = function(doc) {
        var previewDoc = "<div id='preview'>" + 
                         "<div class='overlay'>" +
                         "<div class='container'>" +
                         "<img src='" + fastdial.Cache.getCachedURL(this.getSnapshotURL(), "preview") + "'/>" +
                         "</div></div></div>";
        doc.body.appendChild(fastdial.Dom.parse(previewDoc));
    };
    this.refresh = function() {
        if (!this.properties.isBack) {
            wnd.fastdial.Snapshot.create(this.properties);
            wnd.fastdial.Overlay.updateView();
        }
    };
    this.openProperties = function() {
        if (!this.properties.isBack) {
            openDialog("chrome://fastdial/content/thumbnail/properties.xul", "properties",
                    "chrome,centerscreen,toolbar", this.properties);
        }
    };
}

fastdial.Thumbnail.RATIO = 0.75;
fastdial.Thumbnail.MIN_WIDTH = 100;

fastdial.Thumbnail.getHeight = function(width) {
    return Math.floor(width * fastdial.Thumbnail.RATIO);
}
fastdial.Thumbnail.getWidth = function(height) {
    return Math.floor(height / fastdial.Thumbnail.RATIO);
}
