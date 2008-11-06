/**
 * The Module module.
 *
 * A module is firstly of methods just like in Ruby, in Ruby it can
 * also contain constants, and other things we are currently not implementing
 * on Mew.
 */
Mew.Module = function(methods, body) {
  var mod = Mew.Object.mew();
  Mew.Module.initialize(mod, methods, body);
  mod.klass = Mew.Module;
  return mod;
};

/**
 * The Module.mew constructor.
 */
Mew.Module.mew = Mew.Module;

/**
 * Initialize a module with the given methods and body.
 * Create a new Message for each function in the methods object.
 * Yields the method to the body function if given.
 */
Mew.Module.initialize = function(mod, methods, body) {
  methods = methods || {};
  mod['@methods'] = mod['@methods'] || {};
  mod['@includes'] = mod['@includes'] || [];
  for (var name in methods) {
    if (Mew.isFn(methods[name]))
      mod['@methods'][name] = new Mew.Message(name, methods[name]);
    else throw "Invalid property value for "+name+' '+methods[name];
  }
  Mew.isFn(body) && body(mod);
};

Mew.extend(Mew.Module.prototype, {

  /**
   * Get or set this module name.
   */
  name: function(name) {
    return name && (this['@name'] = name) || this['@name'];
  },

  /**
   * Append features from this mod to the given module.
   *
   * The curren implementation just creates Message objects on the
   * given module.
   * TODO: copy constants when implemented.
   */
  appendFeatures: function(toMod) {
    var methods = this['@methods'];
    for (var name in methods) {
      if (toMod['@methods'][name])
        toMod['@methods'][name].target = methods[name];
      else
        toMod['@methods'][name] = new Mew.Message(name, methods[name]);
    }
  },

  /**
   * Remove the features of this module from the given one.
   */
  removeFeatures: function(toMod) {
    for (name in this['@methods']) {
      if(toMod['@methods'][name]) delete toMod['@methods'][name].target;
      delete toMod['@methods'][name];
    }
  },

  /**
   * Include the given mixin module on this module ancestors hierarchy.
   */
  include : function(mixin) {
    if (!mixin) return this;
    mixin.constructor === Object && (mixin = Mew.Module.mew(mixin));
    if (mixin.klass !== Mew.Module) throw "Can only include modules.";
    if (mixin === this) throw "Cannot include itself";
    if (Mew.indexOf(this['@includes'], mixin) === -1)
      this['@includes'].unshift(mixin);
    mixin.appendFeatures(this);
    mixin.included(this);
    return this;
  },

  /**
   * Uninclude a mixin from this module ancestors hierarchy.
   */
  uninclude: function(mixin) {
    if (mixin.klass !== Mew.Module) throw "Not a module "+mixin;
    mixin.removeFeatures(this);
    var mods = [], includes = this['@includes'], i = includes.length;
    while (i--) includes[i] !== mixin && mods.unshift(mixin);
    this['@includes'] = mods;
    mixin.unincluded(this);
    return this;
  },

  /**
   * Called when this module has been included inMod
   */
  included: function(inMod) { },
  /**
   * Called when this module has been unincluded from inMod
   */
  unincluded: function(inMod) { },

  /**
   * Returns an array of this module ancestors(each being a module/class).
   */
  ancestors: function() {
    var ancestors = [this].concat(this['@includes']);
    if (this === Mew.Kernel) return ancestors;
    for(var sp = this.superclass ; sp ; sp = sp.superclass) {
      ancestors.push(sp);
    }
    ancestors.push(Mew.Kernel);
    return ancestors;
  },

  /**
   * Define a single method on this module.
   */
  defineMethod : function(name, method) {
    this['@methods'][name] = new Mew.Message(name, method);
    this.methodAdded(name);
  },

  /**
   * Remove the named method from this module.
   * Subsequent message applications that were implemented by the method
   * being removed will cause Message#send to seek the correct function again.
   */
  removeMethod: function(name) {
    if(this['@methods'][name]) delete this['@methods'][name].target;
    delete this['@methods'][name];
  },

  /**
   * Obtain the underlying function implementing the given message.
   */
  instanceMethod : function(name) {
    var fun = (new Mew.Message(name)).getMethod(this);
    var thing = this.klass == Mew.Class ? "class" : "module";
    if (!fun) throw "Undefined method `"+name+"' for "+thing+" `"+this+"'";
    return fun;
  },

  /**
   * Obtain the list of methods known by this module.
   */
  instanceMethods : function() {
    var ary = [];
    for (var name in this['@methods']) ary.push(name);
    return ary;
  },

  /**
   * Test if a method by name has been defined on this module hierarchy.
   */
  methodDefined: function(name) {
    var fun = Mew.MethodMissing.getMethod(this, name);
    return !!fun;
  },

  /**
   * Called when a method has been added to this module.
   * Like in Ruby, this method is not called for module included methods.
   */
  methodAdded: function() {},

  /**
   * Called when a method has been removed from this module.
   * Like in Ruby, this method is not called for module included methods.
   */
  methodRemoved: function() {}
});
