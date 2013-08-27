/*Copyright (c) 2007 MapBuzz, Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.*/

// Taken from the Prototype library
Object.extend = function(destination, source) {
    for (var property in source) {
        destination[property] = source[property];
    }
    return destination;
};
JsTemplate = new Object();
JsTemplate.Template = function JsTemplate(value) {
    this.value = value;
    this.compile()
};
Object.extend(JsTemplate.Template.prototype,
{
    compile: function(object, locals) {
        var parser = new JsTemplate.Parser();
        this.func = parser.compile(this.value)
    },

    run: function(locals) {
        return this.func.call(locals);
    }
});
JsTemplate.Parser = function TemplateParser(regex) {
    this.regex = regex || /<%=?([\s\S]*?)%>/g
};
Object.extend(JsTemplate.Parser.prototype,
{
    compile: function(value) {
        var start = 0;
        var delimeter = '_%_';
        var body = value.replace(this.regex,
                function (matchedString, group, offset, fullString) {
                    var replace = delimeter + ";\n";
                    if (matchedString.charAt(2) == "=")
                        replace += "  __out += escapeHTML(" + group + ");\n";
                    else
                        replace += "  " + group + "\n";
                    replace += "  __out += " + delimeter;
                    return replace
                });
        var functionBody = "function escapeHTML(str) {" + 
                "var replacements = { \"&\": \"&amp;\", \"<\": \"&lt;\", \">\": \"&gt;\" };" +
                "return String(str).replace(/[&\"<>]/g, function (m) replacements[m]);" +
                "}" +
                "var __out = " + delimeter + body + delimeter + ";\n" +
                "return __out;\n";
        // Convert ' to \' and then change the delimeter to '
        functionBody = functionBody.replace(/'/g, "\\'").replace(/\r\n/g, "\\r\\n");
        var regex = new RegExp(delimeter, 'g');
        functionBody = functionBody.replace(regex, "'");
        // Compile our function and return it
        return new Function(functionBody)
    }
});