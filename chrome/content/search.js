fastdial.SearchController = function(input, engine) {
    var index = -1;
    var table, typedValue = "";

    var controller;

    try {
        Components.utils.import("resource://gre/modules/SearchSuggestionController.jsm");
        controller = new SearchSuggestionController(onSearchResult);
    }
    catch(e) {}

    input.addEventListener("input", onInput, false);
    input.addEventListener("keypress", onKeyPress, false);

    function onSearchResult(result) {
        table = createTable(result.remote);
    }

    function onInput(e) {
        if (!e.target.value) return hideTable();
        if (controller) controller.fetch(e.target.value, false, engine);
    }

    function removeTable() {
        if (table) {
            fastdial.Dom.remove(table);
            table = null;
        }
    }

    function isTableVisible() {
        return table && table.style.display != "none";
    }

    function hideTable() {
        if (!table) return;

        if (index != -1) {
            var tr = table.childNodes[index];
            fastdial.Dom.removeClass(tr, "selected");
            index = -1;
        }
        table.style.display = "none";
    }

    function showTable() {
        table.style.display = "block";
    }

    function createTable(remote) {
        removeTable();

        var table = document.createElement("table");
        table.setAttribute("class", "suggestion");
        table.addEventListener("click", onClick, false);
        for(var i in remote) {
            var tr = document.createElement("tr");
            table.appendChild(tr);
            var td = document.createElement("td");
            tr.appendChild(td);
            var text = document.createTextNode(remote[i]);
            td.appendChild(text);
        }
        table.style.left = input.offsetLeft;
        table.style.top = input.offsetTop + input.offsetHeight;
        document.body.appendChild(table);
        index = -1;
        return table;
    }
    
    function onClick(e) {
        if (fastdial.Dom.is(e.target, "td")) {
          input.value = e.target.firstChild.nodeValue;
          hideTable();
          input.focus();
          doSearch(input.value);
        }
    }
 
    function onKeyPress(e) {
        if (index == -1) {
            typedValue = e.target.value;
        }
        switch (e.keyCode) {
            case e.DOM_VK_DOWN:
                if (!isTableVisible()) return showTable();
                
                if (index >= 0 && index < table.childNodes.length) {
                    var tr = table.childNodes[index];
                    fastdial.Dom.removeClass(tr, "selected");
                }
                if (++index >= table.childNodes.length) {
                    index = -1;
                }
                if (index >= 0 && index < table.childNodes.length) {
                    var tr = table.childNodes[index];
                    fastdial.Dom.addClass(tr, "selected");
                    e.target.value = tr.firstChild.firstChild.nodeValue;
                }
                else {
                    e.target.value = typedValue;
                }
                break;
            case e.DOM_VK_UP:
                if (!isTableVisible()) return;

                if (index >= 0 && index < table.childNodes.length) {
                    var tr = table.childNodes[index];
                    fastdial.Dom.removeClass(tr, "selected");
                }
                if (--index < -1) {
                    index = table.childNodes.length-1;
                }
                if (index >= 0 && index < table.childNodes.length) {
                    var tr = table.childNodes[index];
                    fastdial.Dom.addClass(tr, "selected");
                    e.target.value = tr.firstChild.firstChild.nodeValue;
                }
                else {
                    e.target.value = typedValue;
                }
                break;
            case e.DOM_VK_ESCAPE:
                hideTable();
                break;
            case e.DOM_VK_RETURN:
                input.value = typedValue;
                if (index != -1) {
                    var tr = table.childNodes[index];
                    input.value = tr.firstChild.firstChild.nodeValue;
                }
                hideTable();
                doSearch(input.value);
                break;
        }
    }

    function doSearch(value) {
        var submission = engine.getSubmission(value, null);
        document.location.assign(submission.uri.spec);
    }
}
