/**
 * The Mew ruby Kernel module.
 */
Mew.Kernel = function(){};
Mew.extend(Mew.Kernel.prototype, {

  /**
   * Send a message to an object.
   * :call-seq:
   *   obj.__send__(msg, arg1, arg2);
   */
  __send__ : Mew.Message.send,

  /**
   * Same than __send__
   */
  send: Mew.Message.send,

  /**
   * Send a message to an object with a splat arguments array.
   * :call-seq:
   *   obj._send_('something', [arg1, arg2, arg3]);
   */
  _send_ : function(name, args) {
    return (new Mew.Message(name)).send(this, args);
  },

  /**
   * Include the given module on this object eigen class.
   */
  extend : function(mod) {
    this.eigen.include(mod);
    return this;
  },

  /**
   * Uninclude the given module from this object eigen class.
   */
  unextend : function(mod) {
    this.eigen.uninclude(mod);
    return this;
  },

  /**
   * Test if this object has module on its ancestor chain.
   */
  kindOf: function(module) {
    return Mew.indexOf(this.klass.ancestors(), module) > -1 ||
      Mew.indexOf(this.eigen.ancestors(), module) > -1;
  },

  /**
   * Test if this object responds to a message
   */
  respondTo: function(name) {
    var m = (new Mew.Message(name)).getMethod(this);
    return (Mew.isFn(m) && !m.isMissing);
  },

  /**
   * Obtain the named method as a javascript function
   * bound to the self object.
   *
   * :call-seq:
   *   var m = obj.method("multiply");
   *   m(2, 2) -> 4
   *
   *   var twice = obj.method("multiply").curry(2);
   *   twice(3) -> 6
   *
   *   var onMe = obj.method("something").bind(toOtherObject);
   *   onMe();
   *
   */
  method : function(name) {
    var msg = new Mew.Message(name);
    var m = msg && msg.getMethod(this);
    if (!Mew.isFn(m) || m.isMissing) throw "No such method "+name;
    var fun = function() {
      m.message = fun.message;
      return m.apply(fun.binding, fun.args.concat(Mew.array(arguments)));
    };
    Mew.extend(fun, {
      message: msg,
      unbind : function() {
        return m;
      },
      bind : function(toObj) {
        this.binding = toObj;
        return this;
      },
      curry : function() {
        this.args.concat(arguments);
        return this;
      },
      curring: function(args) {
        this.args.concat(args);
        return this;
      },
      args : [],
      binding : this
    });
    return fun;
  },

  /**
   * Return an string representing this object state.
   */
  inspect: function() {
    return this.toString();
  }
});
