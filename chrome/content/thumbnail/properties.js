var properties = window.arguments[0];
var thumbnail = new fastdial.Thumbnail(properties);
var wnd = fastdial.Utils.getBrowserWindow();

function initialize() {
    initDialog();
    setFolder(properties.isFolder);
    var url = thumbnail.getURL();
    fastdial.Dom.get("url").value = url || "";
    fastdial.Dom.get("title").value = properties.title || "";
    fastdial.Dom.get("description").value = properties.description || "";
    fastdial.Dom.get("logo").value = properties.logo || "";
    fastdial.Dom.get("shortcutKey").value = properties.shortcutKey || "";
    fastdial.Dom.get("refresh").value = properties.refresh || 0;
    fastdial.Dom.get("refreshAll").checked = thumbnail.isRefreshAll();
    fastdial.Dom.get("refreshAll").disabled = properties.logo;
    fastdial.Dom.get("preview").checked = properties.preview;
    fastdial.Utils.merge(properties, getProperties());
    onChangeURL();
    updateFocus();
}

function getProperties() {
    var props = {};
    props.isFolder = fastdial.Dom.get("isFolder").value;
    var url = fastdial.Dom.get("url").value;
    props.url = !url || fastdial.URL.getScheme(url) ? url : "http://" + url + "/";
    props.title = fastdial.Dom.get("title").value;
    props.description = fastdial.Dom.get("description").value;
    props.logo = fastdial.Dom.get("logo").value;
    props.shortcutKey = fastdial.Dom.get("shortcutKey").value;
    var refresh = fastdial.Dom.get("refresh").value;
    props.refresh = Math.max(refresh, 0);
    props.refreshAll = fastdial.Dom.get("refreshAll").checked;
    props.preview = fastdial.Dom.get("preview").checked;
    return props;
}

function clear() {
    fastdial.Dom.get("url").value = "";
    fastdial.Dom.get("title").value = "";
    fastdial.Dom.get("description").value = "";
    fastdial.Dom.get("logo").value = "";
    setShortcutKey("");
    fastdial.Dom.get("refresh").value = 0;
    fastdial.Dom.get("preview").checked = false;
    updateRefreshAll();
}

function setFolder(isFolder) {
    clear();
    fastdial.Dom.get("isFolder").selectedIndex = isFolder ? 1 : 0;
    fastdial.Dom.get("row-url").collapsed = isFolder;
    fastdial.Dom.get("logo").value = isFolder ? fastdial.Prefs.getString("folderLogo") : "";
    updateRefreshAll();
    updateFocus();
}

function updateFocus() {
    var isFolder = fastdial.Dom.get("isFolder").value;
    var id = isFolder ? "title" : "url";
    fastdial.Dom.get(id).select();
}

function initDialog() {
    var dialog = fastdial.Dom.get("fd-dialog-properties");
    if (dialog.instantApply) {
        var accept = dialog.getButton("accept");
        accept.hidden = false;
        accept.disabled = false;
        var cancel = dialog.getButton("cancel");
        cancel.hidden = false;
        cancel.setAttribute("label", fastdial.Bundle.getString("cancel"));
    }
    if (!properties.id) {
        var general = dialog.preferencePanes[0];
        dialog.showPane(general);
    }
}

function onChangeURL() {
    var search = "";
    var isFolder = fastdial.Dom.get("isFolder").value;
    if (isFolder) {
        search = fastdial.Dom.get("title").value;
    } else {
        var url = fastdial.Dom.get("url");
        if (url.value) {
            var nsiURL = fastdial.URL.getNsiURL(url.value);
            search = nsiURL.host.replace(/^www\./, "");
        }
    }
    var link = fastdial.Dom.get("link");
    link.href = link.tooltipText = "http://userlogos.org/logos/top-rated?search=" +
                                                                 encodeURIComponent(search);
}

function browseURL() {
    var file = fastdial.File.chooseFile("open");
    if (file) {
        fastdial.Dom.get("url").value = fastdial.File.getFileURL(file);
    }
}

function browseImage(id) {
    var file = fastdial.File.chooseFile("open", ["images"]);
    if (file) {
        var url = fastdial.File.getFileURL(file);
        fastdial.Dom.get(id).value = url;
        updateRefreshAll();
    }
}

function onAccept() {
    var props = getProperties();

    if ((props.isFolder && !props.title) ||
        (!props.isFolder && !props.url)) return;

    if (properties.isFolder && !props.isFolder) {
        var children = properties.isFolder &&
                fastdial.Storage.getItems(properties.id);
        if (!thumbnail.remove(children && children.length)) return false;
        delete properties.id;
    }

    var isRefreshNeeded =
            props.logo != properties.logo ||
                    props.preview != properties.preview ||
                    (properties.isFolder && !properties.id) ||
                    (!properties.isFolder && props.url != properties.url);

    if (isRefreshNeeded) {
        wnd.fastdial.Loader.stop(thumbnail.properties.logo);
        wnd.fastdial.Loader.stop(thumbnail.getURL());
        var snapshot = thumbnail.getSnapshotURL();
        if (snapshot) {
            fastdial.Cache.remove(snapshot, "preview");
            fastdial.Cache.remove(snapshot);
        }
    }
    fastdial.Utils.merge(properties, props);
    thumbnail.save();
    if (isRefreshNeeded)
        wnd.fastdial.Snapshot.create(properties);
    wnd.fastdial.Overlay.updateView();
}

function setShortcutKey(key) {
    fastdial.Dom.get("shortcutKey").value = key || "";
    fastdial.Dom.get("restartIsNeeded").style.visibility = key ? "visible" : "hidden";
}

function onShortcutKey(e) {
    if (e.keyCode != e.DOM_VK_TAB) {
        setShortcutKey(fastdial.Utils.getShortcutKey(e));
        e.preventDefault();
    }
}

function updateRefreshAll() {
    fastdial.Dom.get("refreshAll").checked = !fastdial.Dom.get("logo").value;
    fastdial.Dom.get("refreshAll").disabled = fastdial.Dom.get("logo").value;
}
