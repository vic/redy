/**
 * The Message class is the base of Mew's method_missing dispatching and
 * is inspired in Rubinius' SendSites, allowing to cache method definitions.
 *
 * Using message objects allows Mew to have an optimal way to determine
 * if method has been superseeded by a new method (eg, when you include
 * a module, that action masks the original function pointer to the newly
 * included method). Using this class we can even uninclude modules or
 * methods.
 *
 * A message is the object responsible for calling methods on Mew objects.
 *
 * A message target can be either a javascript function or another message
 * object.
 * When the message is applied, the real function target is obtained by
 * transversing a chain of message delegations, pointing to the real
 * function to be called wich could have changed since class definition
 * by means of including modules, or extending the object.
 */
Mew.Message = function(name, target) {
  Mew.MethodMissing.addMethod(name);
  this.name = name, this.target = this.original = target;
  return this;
};

/**
 * Kernel#__send__ implementation.
 */
Mew.Message.send = function() {
  var args = Mew.array(arguments), name = args.shift();
  return new Mew.Message(name).send(this, args);
};

Mew.extend(Mew.Message.prototype, {

  /**
   * Obtain the last Message object in this chain. Aka the one having
   * its target attribute pointing to the actuall javascript function.
   *
   * This method is used to obtain the underlying method implementation.
   */
  real : function() {
    var fn = this;
    while (fn && fn.target && typeof fn.target !== 'function') fn = fn.target;
    return fn;
  },

  /**
   * Restore the original target if it was a function and return self.
   */
  restore: function() {
    return Mew.isFn(this.original) && !this.original.isMissing &&
      (this.target = this.original) && this;
  },

  /**
   * Test if this message object has a javascript function as its target.
   */
  hasFun : function() {
    return Mew.isFn(this.target) && !this.target.isMissing;
  },

  /**
   * Message application.
   *
   * Apply this message to the self (first argument) object using the
   * given args array as arguments.
   *
   * If self doesn't respond to this message, its methodMissing method
   * is called, otherwise an 'No such method' exception is raised.
   */
  send : function(self, args) {
    var fun = this.getMethod(self), name = this.name, me = arguments.callee;
    if (fun && (fun.message = this)) return fun.apply(self, args);
    fun = this.getMethod(self, 'methodMissing');
    args = Mew.array(args);
    args.unshift(name);
    if (fun && (fun.message = this)) return fun.apply(self, args);
    throw "No such method `"+name+"' in "+self;
  },

  /**
   * Invoke super implementation.
   * This is called when you do this.callSuper() from a running method.
   * See Mew.MethodMissing.prototype.callSuper.
   *
   * If no arg-list is given, the currentFunction arguments are used
   * in message application, just like ruby's super.
   *
   * If no method is defined on a superclass or mixin, the self.methodMissing
   * message is applied if it exists, otherwise an exception is raised.
   *
   * The super methods called by this function have its this._msg()
   * value to the same message object (this),allowing them to know the message
   * from which they were called.
   *    this._msg() -> the message that caused the current method invocation
   *    this._msg().name -> the message name we are responding to.
   *
   * :call-seq:
   *    msg.supper(self, currentFunction, arg0, arg1, ...)
   */
  supper: function() {
    var args = Mew.array(arguments), self = args.shift(), from = args.shift();
    if (args.length == 0) args = Mew.array(from.arguments);
    var name = this.name;
    var methods = [], mod, site, fun;
    if (!this._superMethods_) {
      for (var i = 0, a = self.eigen.ancestors(), n = a.length; i < n; i++) {
        mod = a[i]['@methods'];
        site = mod && a[i]['@methods'][name];
        fun = site && site.real().target;
        if (fun && Mew.indexOf(methods, fun) == -1) methods.unshift(fun);
      }
      this._superMethods_ = methods;
    }
    methods = this._superMethods_;
    var idx = Mew.indexOf(methods, from), sup = methods[idx - 1];
    if (sup) {
      sup.message = this;
      return sup.apply(self, args);
    }
    fun = this.getMethod(self, 'methodMissing');
    args.unshift(name);
    if (fun && (fun.message = this)) return fun.apply(self, args);
    throw "No such method `"+name+"' in "+self;
  },

  /**
   * Obtain the JavaScript function used by self to respond to this
   * message.
   */
  getMethod : function(self, name) {
    name = name || this.name;
    if (!self.klass) return Mew.isFn(self[name]) && self[name];
    var sendsite = this.getSendSite(self, name);
    return sendsite && sendsite.target;
  },

  /**
   * Obtain the Message object having the function used by self to
   * respond to this message.
   */
  getSendSite : function(self, name) {
    if (!self.klass) return undefined;
    name = name || this.name;
    var sendsite, real, removed;
    var fromMod = function(mod) {
      if (mod && mod['@methods'] && (sendsite = mod['@methods'][name]))
        real = sendsite.real();
      if (real && !real.hasFun())
        (real = sendsite.restore()) || delete mod['@methods'][name];
      return real && real.hasFun() && real;
    };
    var fromAnc = function(module) {
      var mod, a = Mew.Module.prototype.ancestors.apply(module);
      for (var i = 0, n = a.length; i < n; i++) {
        if ( (mod = a[i]) && fromMod(mod) ) {
          module['@methods'][name] = new Mew.Message(name, sendsite);
          break;
        }
      }
      return real;
    };
    return (self.eigen && fromMod(self.eigen)) ||
           (self.klass && fromMod(self.klass)) ||
           (self.eigen && fromAnc(self.eigen)) ||
           (self.klass && fromAnc(self.klass));
  }
});

/**
 * The MethodMissing object is the prototype of all Mew objects.
 *
 * The MethodMissing.prototype is a collection of functions that
 * simply activate a message in the current object. see Message#send
 *
 * Mew doesn't stores method implementations on its object instances,
 * instead it uses the MethodMissing.prototype as a fallback to which
 * all methods applied by the user are called, causing Mew to resolve
 * the correct method implementation (which could have changed dynamically)
 * to be executed.
 *
 * When a new module/class is defined, all its method names are added
 * to the MethodMissing.prototype, allowing ALL Mew objects to have the
 * same message, but when a message is applied (eg. obj.hello() ) to some
 * object, Message#send executes the real message implementation or calls
 * methodMissing if the object responds to it, otherwise an 'No such method'
 * exception is raised.
 *
 * :call-seq:
 *   obj = Mew.Object.mew(); // a new Mew object.
 *   obj.helloWorld.isMissing(obj) // test if obj understands helloWorld msg.
 *   obj.helloWorld(); // Apply the helloWorld message to obj
 */
Mew.MethodMissing = function(name) {
  if (!name) return this; // called as constructor with no args
  var missing = function() { // the message application delegate.
    return (new Mew.Message(name)).send(this, arguments);
  };
  missing.name = name;
  missing.isMissing = function(onObj) {
    return !(new Mew.Message(name)).getMethod(onObj);
  };
  return missing;
};

Mew.extend(Mew.MethodMissing.prototype, {

  /**
   * Obtain the message object that caused the current method invocation.
   */
  _msg: function() {
    return arguments.callee.caller.message;
  },

  /**
   * Call the super method with the same message name than the current
   * method being executed. See Message#supper
   */
  callSuper: function() {
    var fun = arguments.callee.caller, msg = fun.message;
    return msg.supper.apply(msg, [this, fun].concat(Mew.array(arguments)));
  }
});

Mew.extend(Mew.MethodMissing, {

  /**
   * Add a message activator function to the MethodMissing.prototype.
   */
  addMethod : function (name) {
    if (Mew.MethodMissing.prototype[name])
      return Mew.MethodMissing.prototype[name];
    Mew.MethodMissing.prototype[name] = Mew.MethodMissing(name);
    return Mew.MethodMissing.prototype[name];
  },

  /**
   * Add the messages from object to the MethodMissing.prototype.
   */
  addMethods: function(object) {
    var methods = [], property;

    if (object instanceof Array)
      for(var i = 0, n = object.length, p; i < n; i ++) {
        p = object[i];
        Number(p) !== p && this.addMethod(p);
      }
    else for (property in object)
      Number(property) !== property && this.addMethod(property);

    object.prototype &&
      this.addMethods(object.prototype);
  }
});

Mew.MethodMissing.addMethods(Object.prototype);
Mew.MethodMissing.addMethods([
  "abbr", "abs", "accept", "acceptCharset", "accesskey", "acos", "action", "addEventListener",
  "adjacentNode", "align", "alignWithTop", "alink", "alt", "anchor", "appendChild", "appendedNode",
  "apply", "archive", "arguments", "arity", "asin", "atan", "atan2", "attrNode", "attributes",
  "axis", "background", "bgcolor", "big", "blink", "blur", "bold", "border", "call", "caller",
  "ceil", "cellpadding", "cellspacing", "char", "charAt", "charCodeAt", "charoff", "charset",
  "checked", "childNodes", "cite", "className", "classid", "clear", "click", "clientHeight",
  "clientLeft", "clientTop", "clientWidth", "cloneNode", "code", "codebase", "codetype", "color",
  "cols", "colspan", "compact", "concat", "content", "coords", "cos", "data", "datetime", "declare",
  "deep", "defer", "dir", "disabled", "dispatchEvent", "enctype", "event", "every", "exec", "exp",
  "face", "filter", "firstChild", "fixed", "floor", "focus", "fontcolor", "fontsize", "forEach",
  "frame", "frameborder", "fromCharCode", "getAttribute", "getAttributeNS", "getAttributeNode",
  "getAttributeNodeNS", "getDate", "getDay", "getElementsByTagName", "getElementsByTagNameNS",
  "getFullYear", "getHours", "getMilliseconds", "getMinutes", "getMonth", "getSeconds", "getTime",
  "getTimezoneOffset", "getUTCDate", "getUTCDay", "getUTCFullYear", "getUTCHours",
  "getUTCMilliseconds", "getUTCMinutes", "getUTCMonth", "getUTCSeconds", "getYear", "global",
  "handler", "hasAttribute", "hasAttributeNS", "hasAttributes", "hasChildNodes", "hasOwnProperty",
  "headers", "height", "href", "hreflang", "hspace", "htmlFor", "httpEquiv", "id", "ignoreCase",
  "index", "indexOf", "innerHTML", "input", "insertBefore", "insertedNode", "isPrototypeOf", "ismap",
  "italics", "join", "label", "lang", "language", "lastChild", "lastIndex", "lastIndexOf", "length",
  "link", "listener", "localName", "log", "longdesc", "map", "marginheight", "marginwidth", "match",
  "max", "maxlength", "media", "method", "min", "multiline", "multiple", "name", "namespace",
  "namespaceURI", "nextSibling", "node", "nodeName", "nodeType", "nodeValue", "nohref", "noresize",
  "normalize", "noshade", "now", "nowrap", "object", "offsetHeight", "offsetLeft", "offsetParent",
  "offsetTop", "offsetWidth", "onblur", "onchange", "onclick", "ondblclick", "onfocus", "onkeydown",
  "onkeypress", "onkeyup", "onload", "onmousedown", "onmousemove", "onmouseout", "onmouseover",
  "onmouseup", "onreset", "onselect", "onsubmit", "onunload", "ownerDocument", "parentNode", "parse",
  "pop", "pow", "prefix", "previousSibling", "profile", "prompt", "propertyIsEnumerable", "push",
  "random", "readonly", "reduce", "reduceRight", "rel", "removeAttribute", "removeAttributeNS",
  "removeAttributeNode", "removeChild", "removeEventListener", "removedNode", "replace",
  "replaceChild", "replacedNode", "rev", "reverse", "round", "rows", "rowspan", "rules", "scheme",
  "scope", "scrollHeight", "scrollIntoView", "scrollLeft", "scrollTop", "scrollWidth", "scrolling",
  "search", "selected", "setAttribute", "setAttributeNS", "setAttributeNode", "setAttributeNodeNS",
  "setDate", "setFullYear", "setHours", "setMilliseconds", "setMinutes", "setMonth", "setSeconds",
  "setTime", "setUTCDate", "setUTCFullYear", "setUTCHours", "setUTCMilliseconds", "setUTCMinutes",
  "setUTCMonth", "setUTCSeconds", "setYear", "shape", "shift", "sin", "size", "slice", "small",
  "some", "sort", "source", "span", "splice", "split", "sqrt", "src", "standby", "start", "strike",
  "style", "sub", "substr", "substring", "summary", "sup", "tabIndex", "tabindex", "tagName", "tan",
  "target", "test", "text", "textContent", "title", "toArray", "toFunction", "toGMTString",
  "toLocaleDateString", "toLocaleFormat", "toLocaleString", "toLocaleTimeString", "toLowerCase",
  "toSource", "toString", "toUTCString", "toUpperCase", "type", "unshift", "unwatch", "useCapture",
  "usemap", "valign", "value", "valueOf", "valuetype", "version", "vlink", "vspace", "watch", "width"
]);
