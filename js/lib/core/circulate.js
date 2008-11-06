/**
 * To load the Mew runtime, load files in the following order:
 *
 * var mew = 'js/lib/';
 * load(mew+'core/core.js');
 * load(mew+'core/message.js');
 * load(mew+'core/object.js');
 * load(mew+'core/kernel.js');
 * load(mew+'core/module.js');
 * load(mew+'core/class.js');
 * load(mew+'core/circulate.js');
 */

Mew.Module = (function(proto) {
  var module = Mew.Class.mew(Mew.Object, proto);
  module.klass = module;
  module.superclass = Mew.Object;
  module.prototype = proto;
  module.name("Module");
  module.initialize = Mew.Module.initialize;
  module.mew = Mew.Module.mew;
  return module;
})(Mew.Module.prototype);

Mew.Kernel = (function(proto) {
  var kern = Mew.Module.mew(proto);
  kern.prototype = proto;
  kern.name("Kernel");
  return kern;
})(Mew.Kernel.prototype);


Mew.Class = (function(proto) {
  var klass = Mew.Class.mew(Mew.Module, proto);
  klass.klass = klass;
  klass.superclass = Mew.Module;
  klass.prototype = proto;
  klass.mew = Mew.Class.mew;
  klass.name("Class");
  return klass;
})(Mew.Class.prototype);


Mew.Object = (function(proto) {
  var obj = Mew.Class.mew(undefined, proto);
  Mew.Module.superclass = obj;
  obj.prototype = proto;
  obj.include(Mew.Kernel);
  obj.name("Object");
  return obj;
})(Mew.Object.prototype);
