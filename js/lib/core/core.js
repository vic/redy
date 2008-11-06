/**
 * Mew core utilities.
 * Some of this methods are based on James Coglan's work in JS.Class
 */
var Mew = function() { };
Mew.prototype = {

  /**
   * Copy properties from second to first argument, returning the first.
   * :call-seq:
   *   Mew.extend(obj, { some: 'properties' });
   */
  extend : function(object, methods) {
    if (!methods) { return object; }
    for (var prop in methods) {
      var getter = methods.__lookupGetter__ && methods.__lookupGetter__(prop),
        setter = methods.__lookupSetter__ && methods.__lookupSetter__(prop);
      if (getter || setter) {
        if (getter) object.__defineGetter__(prop, getter);
        if (setter) object.__defineSetter__(prop, setter);
      } else {
        if (object[prop] === methods[prop]) continue;
        object[prop] = methods[prop];
      }
    }
    return object;
  },

  /**
   * Copy an iterable object into a new array.
   * :call-seq:
   *    Mew.array(arguments);
   */
  array: function(iterable) {
    if (!iterable) return [];
    if (iterable.toArray) return iterable.toArray();
    var length = iterable.length, results = [];
    while (length--) results[length] = iterable[length];
    return results;
  },

  /**
   * Return the index of second argument in the first argument array.
   */
  indexOf: function(haystack, needle) {
    for (var i = 0, n = haystack.length; i < n; i++) {
      if (haystack[i] === needle) return i;
    }
    return -1;
  },

  /**
   * Test if the given object is a JavaScript function.
   */
  isFn: function(object) {
    return object instanceof Function;
  }
};


Mew = new Mew;
