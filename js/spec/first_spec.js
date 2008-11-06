var mew = 'js/lib/';
load(mew+'core/core.js');
load(mew+'core/message.js');
load(mew+'core/object.js');
load(mew+'core/kernel.js');
load(mew+'core/module.js');
load(mew+'core/class.js');
load(mew+'core/circulate.js');
load(mew+'spec.js');

var spec = Mew.Spec.mew(function(s){

  s.describe("Mew.Class", function(d) {

    d.include({
      hello: function() {
        print("hello");
      }
    });

    d.it({
      'should respond to mew': function(i) {
        i.expect(Mew.Class).to_respond_to('mew');
      },
      'should create objects of its class': function(i) {
        var obj = Mew.Class.mew();
        i.expect(obj.klass).to_be(Mew.Class);
        var ins = obj.mew();
        i.expect(ins.klass).to_be(obj);
      },
      'should create objects with metaclass': function(i) {
        var obj = Mew.Class.mew();
        i.expect(obj.eigen).to_be_kind_of(Mew.Class);
      },
      'should call initialize on new objects': function(i) {
        var called;
        var cls = Mew.Class.mew({
          initialize: function(value)  { called = value; }
        });
        cls.mew(true);
        i.expect(called).to_be(true);
      }
    });

    d.it("is a class", function(i) {
      i.expect(Mew.Class.klass).to_be(Mew.Class);
    });

  });

  s.describe('callSuper', {
    'calls same method on superclass': function(i) {
      var A = Mew.Class.mew({ num: function(n) { return 1 + (n || 0); }});
      var B = Mew.Class.mew(A,
        { num: function(n) { return n * this.callSuper(n); }});
      var a = A.mew();
      i.expect(a.num()).to_be(1);
      i.expect(a.num(1)).to_be(2);
      var b = B.mew();
      i.expect(b.num(2)).to_be(6);
    },

    'calls same method on mixins': function(i) {
      var A = Mew.Class.mew({
        hello: function() {
          return [this._msg().name].concat(Mew.array(arguments)).join(' ');
        }
      });
      var M = Mew.Module.mew({
        hello: function() { return this.callSuper() + ", que tal"; }
      });
      var N = Mew.Module.mew({
        hello: function(who) { return this.callSuper('ruby', who); }
      });
      var a = A.mew();
      i.expect(a.hello()).to_equal("hello");
      a.extend(M);
      i.expect(a.hello('world')).to_equal("hello world, que tal");
      a.extend(N);
      i.expect(a.hello('world')).to_equal("hello ruby world, que tal");
    },

    'raises if no methodMissing defined and no more super': function(i){
      var A = Mew.Class.mew({ hola: function(){ return this.callSuper(); }});
      var a = A.mew();
      i.expect(a.method('hola')).to_raise(/no such method/i);
    },

    'calls defined methodMissing if no more super method' : function(i) {
      var missed;
      var A = Mew.Class.mew({
        methodMissing: function(name) {
          missed = this._msg().name;
          i.expect(name).to_be(missed);
        },
        hello: function() {
          return this.callSuper();
        }
      });
      var a = A.mew();
      a.hello();
      i.expect(missed).to_be('hello');
    }
  });

});

spec.run(Mew.Spec.SpecDoc.mew(print));