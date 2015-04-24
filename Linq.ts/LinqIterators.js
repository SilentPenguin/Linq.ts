var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var LinqIteratorResult = (function () {
    function LinqIteratorResult(value, done) {
        this.value = value;
        this.done = done;
    }
    return LinqIteratorResult;
})();
var LinqIterator = (function () {
    function LinqIterator() {
    }
    LinqIterator.prototype.all = function () {
        var result = [];
        var item;
        this.reset();
        item = this.next();
        while (!item.done) {
            result.push(item.value);
            item = this.next();
        }
        return result;
    };
    LinqIterator.prototype.reset = function () {
        throw Error;
    };
    LinqIterator.prototype.current = function () {
        throw Error;
    };
    LinqIterator.prototype.next = function () {
        throw Error;
    };
    return LinqIterator;
})();
var IndexedIterator = (function (_super) {
    __extends(IndexedIterator, _super);
    function IndexedIterator() {
        _super.call(this);
        this.index = 0;
    }
    IndexedIterator.prototype.reset = function () {
        this.index = 0;
    };
    return IndexedIterator;
})(LinqIterator);
var ParentIterator = (function (_super) {
    __extends(ParentIterator, _super);
    function ParentIterator(parent) {
        _super.call(this);
        this.parent = parent;
    }
    ParentIterator.prototype.reset = function () {
        this.parent.reset();
    };
    return ParentIterator;
})(LinqIterator);
var DualParentIterator = (function (_super) {
    __extends(DualParentIterator, _super);
    function DualParentIterator(parent, otherparent) {
        _super.call(this, parent);
        this.otherparent = otherparent;
    }
    DualParentIterator.prototype.reset = function () {
        _super.prototype.reset.call(this);
        this.otherparent.reset();
    };
    return DualParentIterator;
})(ParentIterator);
var ConcatIterator = (function (_super) {
    __extends(ConcatIterator, _super);
    function ConcatIterator(parent, otherParent) {
        _super.call(this, parent, otherParent);
    }
    ConcatIterator.prototype.next = function () {
        var item = this.parent.next();
        if (item.done) {
            item = this.otherparent.next();
        }
        return item;
    };
    return ConcatIterator;
})(DualParentIterator);
var DistinctIterator = (function (_super) {
    __extends(DistinctIterator, _super);
    function DistinctIterator(parent, func) {
        _super.call(this, parent);
        this.func = func;
        this.items = [];
    }
    DistinctIterator.prototype.next = function () {
        var _this = this;
        var item = this.parent.next();
        while (!item.done) {
            if (this.items.every(function (value, index, array) { return !_this.func(item.value, value); })) {
                break;
            }
            else {
                item = this.parent.next();
            }
        }
        this.items.push(item.value);
        return item;
    };
    DistinctIterator.prototype.reset = function () {
        this.items.length = 0;
        _super.prototype.reset.call(this);
    };
    return DistinctIterator;
})(ParentIterator);
var ExceptIterator = (function (_super) {
    __extends(ExceptIterator, _super);
    function ExceptIterator() {
        _super.apply(this, arguments);
    }
    ExceptIterator.prototype.in = function (array, otherArray) {
        var _this = this;
        return array.filter(function (item) { return otherArray.every(function (value) { return !_this.func(item, value); }); });
    };
    return ExceptIterator;
})(IntersectIterator);
var GroupByIterator = (function (_super) {
    __extends(GroupByIterator, _super);
    function GroupByIterator(parent, key, element, result, func) {
        _super.call(this, parent);
        this.key;
        this.element = element;
        this.result = result;
        this.func;
    }
    GroupByIterator.prototype.next = function () {
        var _this = this;
        var item = this.parent.next();
        var key;
        var filter;
        var element;
        var result;
        while (!item.done && result == null) {
            key = this.key(item.value);
            if (this.keys.some(function (value) { return _this.func(value, key); })) {
                item = this.parent.next();
            }
            else {
                filter = new WhereIterator(this.parent, function (item) { return _this.func(key, _this.key(item)); });
                element = new SelectIterator(filter, this.element);
                result = this.result(key, new Group(key, element));
                this.keys.push(key);
            }
        }
        return new LinqIteratorResult(result, item.done);
    };
    GroupByIterator.prototype.reset = function () {
        this.keys.length = 0;
        _super.prototype.reset.call(this);
    };
    return GroupByIterator;
})(ParentIterator);
var GroupJoinIterator = (function (_super) {
    __extends(GroupJoinIterator, _super);
    function GroupJoinIterator(parent, otherparent, outer, inner, selc, func) {
        _super.call(this, parent, otherparent);
        this.outer = outer;
        this.inner = inner;
        this.selc = selc;
        this.func = func;
    }
    GroupJoinIterator.prototype.next = function () {
        var _this = this;
        var key;
        var match;
        var done;
        var filter;
        var value;
        if (this.currentouter == null) {
            this.currentouter = this.parent.next();
        }
        while (!this.currentouter.done && !match) {
            key = this.outer(this.currentouter.value);
            filter = new WhereIterator(this.otherparent, function (item) { return _this.func(key, _this.inner(item)); });
            value = this.selc(this.currentouter.value, new Linq(filter));
        }
        done = this.currentouter.done;
        return new LinqIteratorResult(value, done);
    };
    GroupJoinIterator.prototype.reset = function () {
        this.currentouter = null;
        _super.prototype.reset.call(this);
    };
    return GroupJoinIterator;
})(DualParentIterator);
var IntersectIterator = (function (_super) {
    __extends(IntersectIterator, _super);
    function IntersectIterator(parent, otherparent, func) {
        _super.call(this, parent, otherparent);
        this.func = func;
        this.items = [];
    }
    IntersectIterator.prototype.next = function () {
        var results;
        var otherresults;
        var done;
        var value;
        if (!this.flattend) {
            results = this.parent.all();
            otherresults = this.otherparent.all();
            this.items.concat(this.in(results, otherresults));
            this.items.concat(this.in(otherresults, results));
            this.flattend = true;
        }
        done = !this.items.length;
        value = done ? null : this.items.shift();
        return new LinqIteratorResult(value, done);
    };
    IntersectIterator.prototype.in = function (array, otherArray) {
        var _this = this;
        return array.filter(function (item) { return otherArray.some(function (value) { return _this.func(item, value); }); });
    };
    IntersectIterator.prototype.reset = function () {
        this.items.length = 0;
        this.flattend = false;
        _super.prototype.reset.call(this);
    };
    return IntersectIterator;
})(DualParentIterator);
var JoinIterator = (function (_super) {
    __extends(JoinIterator, _super);
    function JoinIterator(parent, otherparent, outer, inner, selc, func) {
        _super.call(this, parent, otherparent);
        this.outer = outer;
        this.inner = inner;
        this.selc = selc;
        this.func = func;
    }
    JoinIterator.prototype.next = function () {
        var inner;
        var outerkey;
        var innerkey;
        var value;
        var done;
        var match;
        if (this.currentouter == null) {
            this.currentouter = this.parent.next();
        }
        while (!this.currentouter.done && !match) {
            outerkey = this.outer(this.currentouter.value);
            while (!inner.done && !match) {
                inner = this.otherparent.next();
                innerkey = this.inner(inner.value);
                match = this.func(outerkey, innerkey);
            }
            if (!match) {
                this.currentouter = this.parent.next();
            }
        }
        done = this.currentouter.done && inner.done;
        value = done ? null : this.selc(this.currentouter.value, inner.value);
        return new LinqIteratorResult(value, done);
    };
    JoinIterator.prototype.reset = function () {
        this.currentouter = null;
        _super.prototype.reset.call(this);
    };
    return JoinIterator;
})(DualParentIterator);
var OrderByIterator = (function (_super) {
    __extends(OrderByIterator, _super);
    function OrderByIterator(parent, sel, func) {
        _super.call(this, parent);
        this.selc = sel;
        this.func = func;
        this.items = [];
        this.flattend = false;
    }
    OrderByIterator.prototype.baseParent = function () {
        return this.parent;
    };
    OrderByIterator.prototype.next = function () {
        var value;
        var done;
        if (!this.flattend) {
            this.items = this.baseParent().all();
            this.items.sort(this.sort);
        }
        done = !this.items.length;
        value = done ? null : this.items.shift();
        return new LinqIteratorResult(value, done);
    };
    OrderByIterator.prototype.sort = function (a, b) {
        var akey = this.selc(a);
        var bkey = this.selc(b);
        return this.func(akey, bkey);
    };
    OrderByIterator.prototype.reset = function () {
        this.items.length = 0;
        this.flattend = false;
        _super.prototype.reset.call(this);
    };
    return OrderByIterator;
})(ParentIterator);
var RangeIterator = (function (_super) {
    __extends(RangeIterator, _super);
    function RangeIterator(start, count) {
        _super.call(this);
        this.start = start;
        this.count = count;
    }
    RangeIterator.prototype.next = function () {
        var done = this.index < this.count;
        var value = done ? null : this.start + this.index;
        this.index++;
        return new LinqIteratorResult(value, done);
    };
    return RangeIterator;
})(IndexedIterator);
var RepeatIterator = (function (_super) {
    __extends(RepeatIterator, _super);
    function RepeatIterator(value, count) {
        _super.call(this);
        this.value = value;
        this.count = count;
    }
    RepeatIterator.prototype.next = function () {
        var done = this.index < this.count;
        var value = done ? null : this.value;
        this.index++;
        return new LinqIteratorResult(value, done);
    };
    return RepeatIterator;
})(IndexedIterator);
var ReverseIterator = (function (_super) {
    __extends(ReverseIterator, _super);
    function ReverseIterator(parent) {
        _super.call(this, parent);
        this.items = [];
        this.flattend = false;
    }
    ReverseIterator.prototype.next = function () {
        var item = this.parent.next();
        var value;
        var done;
        if (!this.flattend) {
            this.items = this.all();
            this.flattend = true;
        }
        done = !this.items.length;
        value = done ? null : this.items.pop();
        return new LinqIteratorResult(value, done);
    };
    ReverseIterator.prototype.reset = function () {
        this.items.length = 0;
        this.flattend = false;
        _super.prototype.reset.call(this);
    };
    return ReverseIterator;
})(ParentIterator);
var SelectIterator = (function (_super) {
    __extends(SelectIterator, _super);
    function SelectIterator(parent, func) {
        _super.call(this, parent);
        this.func = func;
    }
    SelectIterator.prototype.next = function () {
        var item = this.parent.next();
        var result;
        if (!item.done) {
            result = this.func(item.value);
        }
        return new LinqIteratorResult(result, item.done);
    };
    return SelectIterator;
})(ParentIterator);
var SelectManyIterator = (function (_super) {
    __extends(SelectManyIterator, _super);
    function SelectManyIterator(parent, func) {
        _super.call(this, parent);
        this.func = func;
        this.items = [];
    }
    SelectManyIterator.prototype.next = function () {
        if (!this.items.length) {
            var item = this.parent.next();
            if (!item.done) {
                this.items = this.func(item.value);
            }
            return new LinqIteratorResult(item.done ? null : this.items.shift(), item.done);
        }
        else {
            return new LinqIteratorResult(this.items.shift(), false);
        }
    };
    SelectManyIterator.prototype.reset = function () {
        this.items.length = 0;
        _super.prototype.reset.call(this);
    };
    return SelectManyIterator;
})(ParentIterator);
var SkipIterator = (function (_super) {
    __extends(SkipIterator, _super);
    function SkipIterator(parent, count) {
        _super.call(this, parent);
        this.count = count;
        this.skipped = false;
    }
    SkipIterator.prototype.next = function () {
        var index = 0;
        while (index < this.count) {
            index++;
            this.parent.next();
        }
        return this.parent.next();
    };
    SkipIterator.prototype.reset = function () {
        this.skipped = false;
        _super.prototype.reset.call(this);
    };
    return SkipIterator;
})(ParentIterator);
var SkipWhileIterator = (function (_super) {
    __extends(SkipWhileIterator, _super);
    function SkipWhileIterator(parent, func) {
        _super.call(this, parent);
        this.func = func;
        this.skipped = false;
    }
    SkipWhileIterator.prototype.next = function () {
        var item = this.parent.next();
        while (!this.skipped && !item.done) {
            this.skipped = this.func(item.value);
            if (this.skipped) {
                break;
            }
            item = this.parent.next();
        }
        return item;
    };
    SkipWhileIterator.prototype.reset = function () {
        this.skipped = false;
        _super.prototype.reset.call(this);
    };
    return SkipWhileIterator;
})(ParentIterator);
var TakeIterator = (function (_super) {
    __extends(TakeIterator, _super);
    function TakeIterator(parent, count) {
        _super.call(this, parent);
        this.count = count;
        this.index = 0;
    }
    TakeIterator.prototype.next = function () {
        return this.index++ < this.count ? this.parent.next() : new LinqIteratorResult(null, true);
    };
    TakeIterator.prototype.reset = function () {
        this.index = 0;
        _super.prototype.reset.call(this);
    };
    return TakeIterator;
})(ParentIterator);
var TakeWhileIterator = (function (_super) {
    __extends(TakeWhileIterator, _super);
    function TakeWhileIterator(parent, func) {
        _super.call(this, parent);
        this.func = func;
    }
    TakeWhileIterator.prototype.next = function () {
        var item = this.parent.next();
        this.done = this.done || this.func(item.value);
        return this.done ? new LinqIteratorResult(null, true) : item;
    };
    TakeWhileIterator.prototype.reset = function () {
        this.done = false;
        _super.prototype.reset.call(this);
    };
    return TakeWhileIterator;
})(ParentIterator);
var ThenByIterator = (function (_super) {
    __extends(ThenByIterator, _super);
    function ThenByIterator(parent, sel, func) {
        _super.call(this, parent, sel, func);
        this.orderedParent = parent;
    }
    ThenByIterator.prototype.baseParent = function () {
        return this.orderedParent.baseParent();
    };
    ThenByIterator.prototype.sort = function (a, b) {
        var akey = this.selc(a);
        var bkey = this.selc(b);
        var result = this.orderedParent.sort(a, b);
        return result != 0 ? result : this.func(akey, bkey);
    };
    return ThenByIterator;
})(OrderByIterator);
var WhereIterator = (function (_super) {
    __extends(WhereIterator, _super);
    function WhereIterator(parent, func) {
        _super.call(this, parent);
        this.func = func;
    }
    WhereIterator.prototype.next = function () {
        var item;
        var match = false;
        while (!match && (item == null || !item.done)) {
            item = this.parent.next();
            match = this.func(item.value);
        }
        return item;
    };
    return WhereIterator;
})(ParentIterator);
var ZipIterator = (function (_super) {
    __extends(ZipIterator, _super);
    function ZipIterator(parent, otherparent, func) {
        _super.call(this, parent, otherparent);
        this.func = func;
    }
    ZipIterator.prototype.next = function () {
        var item = this.parent.next();
        var other = this.otherparent.next();
        var done = item.done || other.done;
        var result = done ? null : this.func(item.value, other.value);
        return new LinqIteratorResult(result, done);
    };
    return ZipIterator;
})(DualParentIterator);
//# sourceMappingURL=LinqIterators.js.map