/**
 * The Mew Object class.
 *
 * All mew obejcts are created using this constructor, having their
 * prototype initialized to a new Mew.MethodMissing object.
 */
Mew.Object = function() {
  var ctor = function(){};
  ctor.prototype = new Mew.MethodMissing();
  return new ctor;
};
/**
 * The Mew.Object constructor
 */
Mew.Object.mew = Mew.Object;
Mew.extend(Mew.Object.prototype, {
  /**
   * The default object initialization method (does nothing)
   */
  initialize: function() {}
});
