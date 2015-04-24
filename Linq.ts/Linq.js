var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Linq = (function () {
    function Linq(iterator) {
        this.allSelector = function (item) { return true; };
        this.notNullSelector = function (item) { return item != null; };
        this.defaultComparer = function (item, value) { return item == value; };
        this.iterator = iterator;
    }
    Linq.prototype.ToIterator = function () {
        return this.iterator;
    };
    Linq.prototype.Aggregate = function (func) {
        var result;
        var item = this.iterator.next();
        while (!item.done) {
            result = func(result, item.value);
            item = this.iterator.next();
        }
        return result;
    };
    Linq.prototype.All = function (func) {
        var result = true;
        var iterator = new SelectIterator(this.iterator, func == null ? this.notNullSelector : func);
        var item = iterator.next();
        while (!item.done && result) {
            result = item.value;
            item = iterator.next();
        }
        return result;
    };
    Linq.prototype.Any = function (func) {
        var result = false;
        var iterator = new SelectIterator(this.iterator, func == null ? this.notNullSelector : func);
        var item = iterator.next();
        while (!item.done && !item.value) {
            result = item.value;
            item = iterator.next();
        }
        return result;
    };
    Linq.prototype.Average = function (func) {
        var result = 0;
        var count = 0;
        var iterator = new SelectIterator(this.iterator, func);
        var item = iterator.next();
        while (!item.done) {
            count++;
            result += item.value;
            item = iterator.next();
        }
        return result / count;
    };
    Linq.prototype.Cast = function () {
        var iterator = new SelectIterator(this.iterator, function (item) { return item; });
        return new Linq(iterator);
    };
    Linq.prototype.Concat = function (other) {
        var iterator = new ConcatIterator(this.iterator, other.iterator);
        return new Linq(iterator);
    };
    Linq.prototype.Contains = function (match, func) {
        var result = false;
        var item = this.iterator.next();
        if (func == null) {
            func = this.defaultComparer;
        }
        while (!item.done && !result) {
            result = func(item.value, match);
            item = this.iterator.next();
        }
        return result;
    };
    Linq.prototype.Count = function (func) {
        var iterator = func == null ? this.iterator : new WhereIterator(this.iterator, func);
        var count = 0;
        var item = iterator.next();
        while (!item.done) {
            count++;
            item = iterator.next();
        }
        return count;
    };
    //DefaultIfEmpty(): Linq<TSource> { }
    Linq.prototype.Distinct = function (func) {
        if (func == null) {
            func = this.defaultComparer;
        }
        var iterator = new DistinctIterator(this.iterator, func);
        return new Linq(iterator);
    };
    Linq.prototype.ElementAt = function (index) {
        var result = this.iterator.next();
        var count = 0;
        while (!result.done && count < index) {
            count++;
            result = this.iterator.next();
        }
        if (result.done) {
            throw RangeError();
        }
        else {
            return result.value;
        }
    };
    Linq.prototype.ElementAtOrDefault = function (index) {
        var result = this.iterator.next();
        var count = 0;
        while (!result.done && count < index) {
            count++;
            result = this.iterator.next();
        }
        return result.done ? null : result.value;
    };
    Linq.prototype.Except = function (other, func) {
        if (func == null) {
            func = this.defaultComparer;
        }
        var iterator = new ExceptIterator(this.iterator, other.iterator, func);
        return new Linq(iterator);
    };
    Linq.prototype.First = function (func) {
        var iterator = func != null ? new WhereIterator(this.iterator, func) : this.iterator;
        var result = iterator.next();
        if (result.done) {
            throw RangeError();
        }
        else {
            return result.value;
        }
    };
    Linq.prototype.FirstOrDefault = function (func) {
        var iterator = func != null ? new WhereIterator(this.iterator, func) : this.iterator;
        var result = iterator.next();
        return result.done ? null : result.value;
    };
    Linq.prototype.GroupBy = function (key, element, result, func) {
        if (element == null) {
            element = function (item) { return item; };
        }
        if (result == null) {
            result = function (key, group) { return group; };
        }
        if (func == null) {
            func = function (outer, inner) { return outer == inner; };
        }
        var iterator = new GroupByIterator(this.iterator, key, element, result, func);
        return new Linq(iterator);
    };
    Linq.prototype.GroupJoin = function (other, outer, inner, selc, func) {
        if (func == null) {
            func = function (outer, inner) { return outer == inner; };
        }
        var iterator = new GroupJoinIterator(this.iterator, other.iterator, outer, inner, selc, func);
        return new Linq(iterator);
    };
    Linq.prototype.Intersect = function (other, func) {
        if (func == null) {
            func = this.defaultComparer;
        }
        var iterator = new IntersectIterator(this.iterator, other.iterator, func);
        return new Linq(iterator);
    };
    Linq.prototype.Join = function (other, outer, inner, selc, func) {
        if (func == null) {
            func = function (outer, inner) { return outer == inner; };
        }
        var iterator = new JoinIterator(this.iterator, other.iterator, outer, inner, selc, func);
        return new Linq(iterator);
    };
    Linq.prototype.Last = function (func) {
        var baseIterator = func == null ? this.iterator : new WhereIterator(this.iterator, func);
        var iterator = new ReverseIterator(baseIterator);
        var result = iterator.next();
        if (result.done) {
            throw RangeError();
        }
        else {
            return result.value;
        }
    };
    Linq.prototype.LastOrDefault = function (func) {
        var baseIterator = func == null ? this.iterator : new WhereIterator(this.iterator, func);
        var iterator = new ReverseIterator(baseIterator);
        var result = iterator.next();
        return result.done ? null : result.value;
    };
    Linq.prototype.Max = function (func) {
        return this.OrderBy(func).Last();
    };
    Linq.prototype.Min = function (func) {
        return this.OrderBy(func).First();
    };
    Linq.prototype.OrderBy = function (selc, func) {
        var iterator = new OrderByIterator(this.iterator, selc, func);
        return new Linq(iterator);
    };
    Linq.prototype.OrderByDecending = function (selc, func) {
        return this.OrderBy(selc, function (a, b) { return -1 * func(a, b); });
    };
    Linq.prototype.Range = function (start, count) {
        var iterator = new RangeIterator(start, count);
        return new Linq(iterator);
    };
    Linq.prototype.Repeat = function (element, count) {
        var iterator = new RepeatIterator(element, count);
        return new Linq(iterator);
    };
    Linq.prototype.Reverse = function () {
        var iterator = new ReverseIterator(this.iterator);
        return new Linq(iterator);
    };
    Linq.prototype.Select = function (func) {
        var iterator = new SelectIterator(this.iterator, func);
        return new Linq(iterator);
    };
    Linq.prototype.SelectMany = function (func) {
        var iterator = new SelectManyIterator(this.iterator, func);
        return new Linq(iterator);
    };
    Linq.prototype.SequenceEqual = function (other, func) {
        var result = true;
        var item = this.iterator.next();
        var otherItem = other.iterator.next();
        if (func == null) {
            func = this.defaultComparer;
        }
        while (result && !item.done && !otherItem.done) {
            result = func(item.value, otherItem.value);
            item = this.iterator.next();
            otherItem = other.iterator.next();
        }
        return result && item.done && otherItem.done;
    };
    Linq.prototype.Single = function (func) {
        var iterator = func != null ? new WhereIterator(this.iterator, func) : this.iterator;
        var result = iterator.next();
        var next = iterator.next();
        if (result.done || !next.done) {
            throw RangeError();
        }
        else {
            return result.value;
        }
    };
    Linq.prototype.SingleOrDefault = function (func) {
        var iterator = func != null ? new WhereIterator(this.iterator, func) : this.iterator;
        var result = iterator.next();
        var next = iterator.next();
        return result.done || !next.done ? null : result.value;
    };
    Linq.prototype.Skip = function (index) {
        var iterator = new SkipIterator(this.iterator, index);
        return new Linq(iterator);
    };
    Linq.prototype.SkipWhile = function (func) {
        var iterator = new SkipWhileIterator(this.iterator, func);
        return new Linq(iterator);
    };
    Linq.prototype.Sum = function (func) {
        var result;
        var item = this.iterator.next();
        while (!item.done) {
            result += func(item.value);
            item = this.iterator.next();
        }
        return result;
    };
    Linq.prototype.Take = function (index) {
        var iterator = new TakeIterator(this.iterator, index);
        return new Linq(iterator);
    };
    Linq.prototype.TakeWhile = function (func) {
        var iterator = new TakeWhileIterator(this.iterator, func);
        return new Linq(iterator);
    };
    Linq.prototype.ThenBy = function (selc, func) {
        var iterator = this.iterator;
        if (iterator.sort != null) {
            iterator = new ThenByIterator(iterator, selc, func);
            return new Linq(iterator);
        }
        else {
            throw TypeError();
        }
    };
    Linq.prototype.ThenByDecending = function (selc, func) {
        return this.ThenBy(selc, function (a, b) { return -1 * func(a, b); });
    };
    Linq.prototype.ToArray = function () {
        return this.iterator.all();
    };
    Linq.prototype.ToObject = function (property, element) {
        var result = {};
        var item = this.iterator.next();
        var key;
        var value;
        if (element == null) {
            element = function (item) { return item; };
        }
        while (!item.done) {
            key = property(item.value);
            value = element(item.value);
            result[key] = value;
            item = this.iterator.next();
        }
        return result;
    };
    Linq.prototype.Union = function (other) {
        return this.Concat(other).Distinct();
    };
    Linq.prototype.Where = function (func) {
        var iterator = new WhereIterator(this.iterator, func);
        return new Linq(iterator);
    };
    Linq.prototype.Zip = function (other, func) {
        var iterator = new ZipIterator(this.iterator, other.iterator, func);
        return new Linq(iterator);
    };
    return Linq;
})();
var Group = (function (_super) {
    __extends(Group, _super);
    function Group(key, iterator) {
        _super.call(this, iterator);
        this.key = key;
    }
    return Group;
})(Linq);
//# sourceMappingURL=Linq.js.map