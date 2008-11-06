/**
 * An RSpec like library for use with Mew.
 *
 */
Mew.Spec = Mew.Class.mew({
  initialize: function(body) {
    this.root = Mew.Spec.ExampleGroup.mew();
    this.applyBody(body);
  },
  applyBody: function(body) {
    body(this);
  },
  describe: function() {
    return this.root._send_('describe', arguments);
  },
  run: function() {
    var filters = [], reporters = [], i = arguments.length, args = arguments;
    while(i--)  {
      var arg = args[i];
      if (typeof arg == 'function') filters.push(arg);
      else if (typeof arg == 'string') {
        filters.push(function(o) { return o.match(arg); });
      }
      else reporters.push(arg);
    }
    if (reporters.length == 0) throw "No reporters given";
    var notify = function() {
      var args = Mew.array(arguments), name = args.shift();
      for (var i = 0, n = reporters.length; i < n; i++) {
        var reporter = reporters[i];
        if (reporter[name]) reporter[name].apply(reporter, args);
      }
    };
    var seen = {};
    notify('start', this);
    this.root.transverse(filters, {
      groupEnd: function(group) {
        if (seen[group.fullName()]) notify('groupEnd', group);
      },
      each : function(example) {
        var group = example.group;
        if (!seen[group.fullName()]) notify('groupStart', group);
        seen[group.fullName()] = example;
        if (example.body) {
          example.extend(Mew.Spec.ExampleMethods);
          example.extend(group.module);
          try {
            notify('exampleStart', example);
            example.body.apply(example, [example]);
            notify('exampleSuccess', example);
          } catch(e) {
            if (e.klass === Mew.Spec.ExampleFailure)
              notify('exampleFailure', example, e);
            else
              notify('exampleError', example, e);
          }
        } else notify('examplePending', example);
      }
    });
    notify('end', this);
  }
});

Mew.Spec.ExampleGroup = Mew.Class.mew({
  initialize: function(parent, name) {
    this.parent = parent, this.name = name;
    this.groups = {}, this.groups.ord = [];
    this.examples = {}, this.examples.ord = [];
    this.module = Mew.Module.mew();
  },

  root: function() {
    var root = this;
    while(root.parent) root = root.parent;
    return root;
  },

  fullName : function() {
    var names = [];
    var root = this;
    do {
      if(root.name) names.unshift(root.name);
      root = root.parent;
    } while(root);
    return names.join(' ');
  },

  transverse: function(filters, cb) {
    if(cb.groupStart) cb.groupStart(this);
    var len = this.examples.ord.length + this.groups.ord.length;
    if (len == 0) return;
    for (var i = 0, n = this.examples.ord.length; i < n; i++) {
      var example = this.examples[this.examples.ord[i]];
      var k = filters.length, matches = k == 0;
      while(!matches && k--) matches = filters[k](example.fullName());
      if (matches && cb.each) cb.each(example);
    }
    for (i = 0, n = this.groups.ord.length; i < n; i++) {
      this.groups[this.groups.ord[i]].transverse(filters, cb);
    }
    if(cb.groupEnd) cb.groupEnd(this);
  },

  include: function(module) {
    this.module.include(module);
  },

  describe: function() {
    var names = [], bodies = [], examples = [];
    for(var i = 0, n = arguments.length; i < n; i++) {
      var arg = arguments[i];
      if (typeof arg == 'string') names.push(arg);
      else if (typeof arg == 'function') bodies.unshift(arg);
      else if (arg.constructor !== Object) throw "Invalid argument";
      else examples.unshift(arg);
    }
    var name = names.join(' ');
    var fullName = (this.fullName() + ' ' +name).replace(/^\s|\s$/, '');
    var group = this.root().groups[fullName];
    if (!group) { // register the new group
      group = this.klass.mew(this, name);
      group.include(this.module);
      this.groups[name] = group;
      this.groups.ord.push(name);
      this.root().groups[fullName] = group;
    }
    if (examples.length > 0) {
      i = examples.length; while(i--) group.it(examples[i]);
    }
    if (bodies.length > 0) {
      i = bodies.length; while(i --) bodies[i](group);
    }
    return group;
  },

  it: function() {
    var names = [], body;
    for(var i = 0, n = arguments.length; i < n; i++) {
      var arg = arguments[i];
      if (typeof arg == 'string') names.push(arg);
      else if (typeof arg == 'function')
        if (body) throw "Body alredy specified.";
        else body = arg;
      else if (arg.constructor === Object)
        for (var name in arg) {
          Mew.isFn(arg[name]) && !Object.prototype[name] &&
            this.it(name, arg[name]);
        }
      else throw "Invalid argument type";
    }
    if (names.length == 0) return undefined;
    var name = names.join(' ');
    if (this.examples[name]) throw "Example already defined";
    var example = Mew.Spec.Example.mew(this, name, body);
    this.examples[name] = example;
    this.examples.ord.push(name);
    return example;
  }
});

Mew.Spec.Example = Mew.Class.mew({
  initialize: function(group, name, body) {
    this.group = group, this.name = name, this.body = body;
  },
  isPending: function() {
    return !this.body;
  },
  fullName: function() {
    var name = this.group.fullName() + ' ' + this.name;
    return name.replace(/^\s|\s$/, '');
  }
});

Mew.Spec.ExampleMethods = Mew.Module.mew({
  expect : function(target) {
    return Mew.Spec.Expectation.mew(target, this);
  },
  dontExpect: function(target) {
    return Mew.Spec.Expectation.mew(target, this, true);
  },
  dont_expect: function(target) {
    return Mew.Spec.Expectation.mew(target, this, true);
  }
});

Mew.Spec.ObjectMethods = {
  should : function(match) {
    return Mew.Spec.Expectation.mew(this, match.example).to(match);
  },
  should_not : function(match) {
    return Mew.Spec.Expectation.mew(this, match.example).notTo(match);
  }
};

Mew.Spec.Expectation = Mew.Class.mew({
  initialize: function(subject, example, negative) {
    this.subject = subject;
    this.example = example;
    this.negative = negative;
  },
  to: function(matcher, negative) {
    var res = !!matcher.matches(this.subject);
    negative = !!(negative ^ this.negative);
    if (res != !negative) {
      throw Mew.Spec.ExampleFailure.mew(this.subject, matcher, negative);
    }
    return res;
  },
  notTo: function(matcher) { return this.to(matcher, true); },
  not_to: function(matcher) { return this.to(matcher, true); }
});

Mew.Spec.ExampleFailure = Mew.Class.mew({
  initialize: function(subject, matcher, negative) {
    this.matcher = matcher, this.negative = negative;
    this.subject = subject, this.message = negative ?
        matcher.negativeFailureMessage() : matcher.failureMessage();
  }
});

Mew.Spec.Matcher = Mew.Class.mew({

  initialize: function() {
    this.argv = Mew.array(arguments);
    this.desc = this.argv.shift();
    this.example = this.argv.shift();
    this.expected = this.argv.shift();
    this.but = '';
  },

  matches: function(subject) {
    this.subject = subject;
    if (!this.respondTo('__matches__')) throw this.desc+" not implemented";
    var args = [subject, this.expected].concat(this.argv);
    return this.__matches__.apply(this, args);
  },

  failureMessage: function() {
    var exp = [this.expected];
    if (this.argv.length > 0) exp = exp.concat(this.argv);
    return 'expected '+this.subject+' to '+this.desc+' '+exp+' '+this.but;
  },

  negativeFailureMessage: function() {
    var exp = [this.expected];
    if (this.argv.length > 0) exp = exp.concat(this.argv);
    return "expected "+this.subject+" not to "+this.desc+" "+exp+' '+this.but;
  }

});
Mew.Spec.Matcher.extend({

  register : function(matcher, klass) {
    klass = klass || {};
    var modules = [];
    if (matcher.constructor === Object) {
      for (var name in matcher) {
        if (matcher.constructor.prototype[name]) continue;
        var fun = matcher[name];
        var methods = {};
        Mew.extend(methods, klass);
        methods['__matches__'] = fun;
        delete methods['matches'];
        var cls = Mew.Class.mew(Mew.Spec.Matcher, methods);
        this.register(name, cls);
      }
    } else if (matcher.constructor === Array) {
      for (var i = 0, n = matcher.length; i < n; i++) {
        var name = matcher[i];
        var fun = klass[name] || klass['matches'];
        var methods = {};
        Mew.extend(methods, klass);
        methods['__matches__'] = fun;
        delete methods['matches'];
        var cls = Mew.Class.mew(Mew.Spec.Matcher, methods);
        this.register(name, cls);
      }
    } else if (matcher.constructor !== String) {
      throw "Invalid matcher name";
    } else {
      var under, methods,
        caps = matcher.replace(/([A-Z])/g, '_\$1').split(/_/),
        desc = [caps[0]];
      for(var i = 1, n = caps.length; i < n; i++) {
        caps[i] = caps[i][0].toUpperCase()+caps[i].slice(1);
        desc[i] = caps[i].toLowerCase();
      }
      caps = caps.join('');
      under = desc.join('_');
      desc = desc.join(' ');

      var match = function() {
        var args = [desc, this].concat(Mew.array(arguments));
        return klass.mew.apply(klass, args);
      };
      var matches = function() {
        return this.to(match.apply(this.example, arguments));
      };
      var notMatches = function() {
        return this.notTo(match.apply(this.example, arguments));
      };

      methods = {}, methods[caps] = match, methods[under] = match;
      Mew.Spec.ExampleMethods.include(methods);

      methods = {};
      methods['to_'+under] = matches, methods['not_to_'+under] = notMatches;
      caps = caps[0].toUpperCase()+caps.slice(1);
      methods['to'+caps] = matches, methods['notTo'+caps] = notMatches;
      Mew.Spec.Expectation.include(methods);
    }
  }

});

Mew.Spec.Matcher.register({
  be : function(a, b) { return a === b; },
  equal : function(a, b) { return a == b; },
  beLessThan : function(a, b) { return a < b; },
  beLessOrEqualThan : function(a, b) { return a <= b; },
  beGreaterThan : function(a, b) { return a > b; },
  beGreaterOrEqualThan : function(a, b) { return a >= b; },
  beKindOf: function(a, b) { return a.constructor === b || a.kindOf(b); },
  respondTo: function() {
    var ary = Mew.array(arguments), obj = ary.shift(), r,
      m = Mew.Kernel.method('respondTo').bind(obj);
    for (var i=0, n=ary.length; i<n && (r = m(ary[i])); i++);
    return r;
  },
  satisfy: function(obj, fun) { return fun(obj); },
  include: function() {
    var ary = Mew.array(arguments), on = ary.shift(), n = ary.length;
    while(n--) if(Mew.indexOf(on, ary[n]) === -1) return false;
    return true;
  },
  raise: function(fun, match) {
    var mfun = match || function() { return true; };
    if (mfun.constructor === String)
      mfun = function(e) { return e.toString() == match; };
    if (mfun.constructor === RegExp)
      mfun = function(e) { return e.toString().match(match); };
    if (typeof mfun !== 'function') throw "expected an exeption matcher";
    try {
      fun();
      return false;
    } catch (e) {
      this.but = 'but raised '+e;
      return mfun(e);
    }
  }
});

Mew.Spec.SpecDoc = Mew.Class.mew({
  initialize : function(print, useColor) {
    this.print = print || print;
    this.color = useColor || true;
    this.succeeded = 0;
    this.pendings = [];
    this.failed = [];
  },

  groupStart : function(group) {
    this.print('');
    this.print(group.fullName());
  },

  exampleSuccess : function(example) {
    this.print(this.info('- '+example.fullName()));
    this.succeeded += 1;
  },

  examplePending : function(example) {
    this.print(this.warn('- '+example.fullName() +
                         ' (PENDING: Not Yet Implemented)'));
    this.pendings.push(example);
  },

  exampleFailure : function(example, failure) {
    this.print(this.error('- '+example.fullName() +
                          ' (FAILED - '+this.failed.length+')'));
    this.failed.push({ failure : failure, example : example });
  },

  exampleError : function(example, failure) {
    this.print(this.error('- '+example.fullName() +
                          ' (ERROR - '+this.failed.length+')'));
    this.failed.push({ error : failure, example : example });
  },

  useColors : function () {
    return this.color != undefined;
  },

  ansi_color: function(str, color) {
    if (!this.useColors()) return str;
    var colors = {
      red : "\033[0;31m",
      green : "\033[0;32m",
      yellow : "\033[0;33m",
      purple : "\033[0;35m"
    };
    return colors[color] + str + "\033[0m";
  },

  info : function(str) {
    return this.ansi_color(str, 'green');
  },

  error : function(str) {
    return this.ansi_color(str, 'red');
  },

  warn : function(str) {
    return this.ansi_color(str, 'purple');
  },

  printPendings : function() {
    if (this.pendings.length > 0) {
      this.print('Pending:');
      for (var i = 0, n = this.pendings.length; i < n; i ++)
        this.print(e.example.fullName() + ' (Not Yet Implemented)');
    }
  },

  printFailures : function() {
    if (this.failed.length < 1) return;
    this.print('');
    this.print('Failures:');
    for (var i = 0, n = this.failed.length; i < n; i++) {
      var f = this.failed[i];
      this.print('');
      this.print(i+')');
      if (f.error) {
        this.print(this.error(f.error+" in '"+
                              f.example.fullName()+"'"));
      } else {
        this.print(this.error("'"+f.example.fullName()+"' FAILED"));
        this.print(f.failure.message);
      }
    }
  },

  start: function() {
    this.print('Running Mew.SpecDoc');
  },

  end : function() {
    this.print('');
    this.printPendings();
    this.printFailures();
    this.print('');
    this.print((this.failed.length +
                this.pendings.length +
                this.succeeded + ' examples, ')+
               (this.failed.length+' failures, ')+
               (this.pendings.length + ' pending'));
  }
});