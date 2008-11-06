/**
 * The Class class.
 */
Mew.Class = function(parent, methods, body) {
  if (!parent) parent = Mew.Object;
  if (parent.constructor === Object) {
    if (Mew.isFn(methods)) body = methods;
    methods = parent;
    parent = Mew.Object;
  }
  var klass = Mew.Object.prototype.constructor.mew();
  klass.klass = Mew.Class;
  klass.superclass = parent;
  klass.eigen = Mew.Object.prototype.constructor.mew();
  klass.eigen.klass = Mew.Class;
  klass.eigen.superclass = klass;
  Mew.Module.initialize(klass.eigen);
  Mew.Module.initialize(klass, methods, body);
  return klass;
};
Mew.Class.mew = Mew.Class;
Mew.extend(Mew.Class.prototype, {

  /**
   * Allocate a new object from this class
   *
   * :call-seq:
   *    SomeClass.allocate();
   */
  allocate : function() {
    var obj = Mew.Object.prototype.constructor.mew();
    obj.klass = this;
    obj.eigen = Mew.Class.prototype.constructor.mew(this);
    return obj;
  },

  /**
   * The default constructor.
   * 'new' is a reserved word on JavaScript, so we use 'mew' here.
   *
   * :call-seq:
   *   SomeClass.mew();
   */
  mew : function() {
    var obj = this.allocate();
    obj.initialize.apply(obj, arguments);
    return obj;
  }
});
