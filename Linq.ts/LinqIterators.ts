interface ILinqIteratorResult<TSource> {
    value: TSource;
    done: boolean;
}

interface ILinqIterator<TSource> {
    reset(): void;
    current(): ILinqIteratorResult<TSource>;
    next(): ILinqIteratorResult<TSource>;
    all(): TSource[];
}

interface IOrderedIterator<TSource> extends ILinqIterator<TSource> {
    baseParent(): ILinqIterator<TSource>;
    sort(a: TSource, b: TSource): number;
}

class LinqIteratorResult<TSource> implements ILinqIteratorResult<TSource> {
    value: TSource;
    done: boolean;

    constructor(value: TSource, done: boolean) {
        this.value = value;
        this.done = done;
    }
}

class LinqIterator<TSource> implements ILinqIterator<TSource> {

    all(): TSource[]{
        var result: TSource[] = [];
        var item: LinqIteratorResult<TSource>;

        this.reset();
        item = this.next();

        while (!item.done) {
            result.push(item.value);
            item = this.next();
        }

        return result;
    }

    reset(): void { throw Error; }

    current(): ILinqIteratorResult<TSource> { throw Error; }

    next(): ILinqIteratorResult<TSource> { throw Error; }
}

class IndexedIterator<TSource> extends LinqIterator<TSource>
{
    protected index: number;

    constructor() {
        super();
        this.index = 0;
    }

    reset(): void {
        this.index = 0;
    }
}

class ParentIterator<TSource, TResult> extends LinqIterator<TResult>
{
    protected parent: ILinqIterator<TSource>;

    constructor(parent: ILinqIterator<TSource>) {
        super();
        this.parent = parent;
    }

    reset(): void {
        this.parent.reset();
    }
}

class DualParentIterator<TSource, TOther, TResult> extends ParentIterator<TSource, TResult>
{
    protected otherparent: ILinqIterator<TOther>;

    constructor(parent: ILinqIterator<TSource>, otherparent: ILinqIterator<TOther>) {
        super(parent);
        this.otherparent = otherparent;
    }

    reset(): void {
        super.reset();
        this.otherparent.reset()
    }
}

class ConcatIterator<TSource> extends DualParentIterator<TSource, TSource, TSource>
{
    constructor(parent: ILinqIterator<TSource>, otherParent: ILinqIterator<TSource>) {
        super(parent, otherParent);
    }

    next(): ILinqIteratorResult<TSource> {
        var item: ILinqIteratorResult<TSource> = this.parent.next();

        if (item.done) {
            item = this.otherparent.next();
        }

        return item;
    }
}

class DistinctIterator<TSource> extends ParentIterator<TSource, TSource>
{
    private func: Comparer<TSource>;
    private items: TSource[];

    constructor(parent: ILinqIterator<TSource>, func: Comparer<TSource>) {
        super(parent);
        this.func = func;
        this.items = [];
    }

    next(): ILinqIteratorResult<TSource> {
        var item: ILinqIteratorResult<TSource> = this.parent.next();

        while (!item.done) {
            if (this.items.every((value, index, array) => !this.func(item.value, value))) {
                break;
            } else {
                item = this.parent.next();
            }
        }

        this.items.push(item.value);

        return item;
    }

    reset(): void {
        this.items.length = 0;
        super.reset();
    }
}

class ExceptIterator<TSource> extends IntersectIterator<TSource>
{
    protected in(array:TSource[], otherArray:TSource[]): TSource[] {
        return array.filter((item) => otherArray.every((value) => !this.func(item, value)));
    }
}

class GroupByIterator<TSource, TKey, TElement, TResult> extends ParentIterator<TSource, any>
{
    private key: Selector<TSource, TKey>;
    private element: Selector<TSource, any>;
    private result: Combiner<TKey, Linq<any>, any>;
    private func: Comparer<TKey>;
    private keys: TKey[];

    constructor(parent: ILinqIterator<TSource>, key: Selector<TSource, TKey>, element: Selector<TSource, any>, result: Combiner<TKey, Linq<any>, any>, func: Comparer<TKey>) {
        super(parent);
        this.key;
        this.element = element;
        this.result = result;
        this.func;
    }

    next(): any {
        var item: ILinqIteratorResult<TSource> = this.parent.next();
        var key: TKey;
        var filter: WhereIterator<TSource>;
        var element: SelectIterator<TSource, TElement>;
        var result: TResult;

        while (!item.done && result == null) {
            key = this.key(item.value);

            if (this.keys.some((value) => this.func(value, key))) {
                item = this.parent.next();
            } else {
                filter = new WhereIterator(this.parent, (item: TSource) => this.func(key, this.key(item)));
                element = new SelectIterator(filter, this.element);
                result = this.result(key, new Group(key, element));
                this.keys.push(key);
            }
        }

        return new LinqIteratorResult(result, item.done);
    }

    reset(): void {
        this.keys.length = 0;
        super.reset();
    }
}

class GroupJoinIterator<TSource, TOther, TKey, TResult> extends DualParentIterator<TSource, TOther, TResult>
{
    private outer: Selector<TSource, TKey>;
    private inner: Selector<TOther, TKey>;
    private selc: Combiner<TSource, Linq<TOther>, TResult>;
    private func: Comparer<TKey>;
    private currentouter: ILinqIteratorResult<TSource>;

    constructor(parent: ILinqIterator<TSource>, otherparent: ILinqIterator<TOther>, outer: Selector<TSource, TKey>, inner: Selector<TOther, TKey>, selc: Combiner<TSource, Linq<TOther>, TResult>, func: Comparer<TKey>) {
        super(parent, otherparent);
        this.outer = outer;
        this.inner = inner;
        this.selc = selc;
        this.func = func;
    }

    next(): ILinqIteratorResult<TResult> {
        var key: TKey;
        var match: boolean;
        var done: boolean;
        var filter: ILinqIterator<TOther>;
        var value: TResult;

        if (this.currentouter == null) {
            this.currentouter = this.parent.next();
        }

        while (!this.currentouter.done && !match) {
            key = this.outer(this.currentouter.value);
            filter = new WhereIterator(this.otherparent, (item: TOther) => this.func(key, this.inner(item)));
            value = this.selc(this.currentouter.value, new Linq(filter));
        }

        done = this.currentouter.done;
        return new LinqIteratorResult<TResult>(value, done);
    }

    reset(): void {
        this.currentouter = null;
        super.reset();
    }
}

class IntersectIterator<TSource> extends DualParentIterator<TSource, TSource, TSource>
{
    protected func: Comparer<TSource>;
    private items: TSource[];
    private flattend: boolean;

    constructor(parent: ILinqIterator<TSource>, otherparent: ILinqIterator<TSource>, func: Comparer<TSource>) {
        super(parent, otherparent);
        this.func = func;
        this.items = [];
    }

    next(): ILinqIteratorResult<TSource> {
        var results: TSource[];
        var otherresults: TSource[];
        var done: boolean;
        var value: TSource;

        if (!this.flattend) {
            results = this.parent.all();
            otherresults = this.otherparent.all();
            this.items.concat(this.in(results, otherresults));
            this.items.concat(this.in(otherresults, results));
            this.flattend = true;
        }

        done = !this.items.length;
        value = done ? null : this.items.shift();

        return new LinqIteratorResult<TSource>(value, done);
    }

    protected in(array: TSource[], otherArray: TSource[]): TSource[] {
        return array.filter((item) => otherArray.some((value) => this.func(item, value)));
    }

    reset(): void {
        this.items.length = 0;
        this.flattend = false;
        super.reset();
    }
}

class JoinIterator<TSource, TOther, TKey, TResult> extends DualParentIterator<TSource, TOther, TResult>
{
    private outer: Selector<TSource, TKey>;
    private inner: Selector<TOther, TKey>;
    private selc: Combiner<TSource, TOther, TResult>;
    private func: Comparer<TKey>;
    private currentouter: ILinqIteratorResult<TSource>;

    constructor(parent: ILinqIterator<TSource>, otherparent: ILinqIterator<TOther>, outer: Selector<TSource, TKey>, inner: Selector<TOther, TKey>, selc: Combiner<TSource, TOther, TResult>, func: Comparer<TKey>) {
        super(parent, otherparent);
        this.outer = outer;
        this.inner = inner;
        this.selc = selc;
        this.func = func;
    }

    next(): ILinqIteratorResult<TResult> {
        var inner: ILinqIteratorResult<TOther>;
        var outerkey: TKey;
        var innerkey: TKey;
        var value: TResult;
        var done: boolean;
        var match: boolean;

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

        return new LinqIteratorResult<TResult>(value, done);
    }

    reset(): void {
        this.currentouter = null;
        super.reset();
    }
}

class OrderByIterator<TSource, TKey> extends ParentIterator<TSource, TSource> implements ILinqIterator<TSource>, IOrderedIterator<TSource>
{
    protected selc: Selector<TSource, TKey>;
    protected func: Orderer<TKey>;
    private items: TSource[];
    private flattend: boolean;

    constructor(parent: ILinqIterator<TSource>, sel: Selector<TSource, TKey>, func: Orderer<TKey>) {
        super(parent);
        this.selc = sel;
        this.func = func;
        this.items = [];
        this.flattend = false;
    }

    baseParent(): ILinqIterator<TSource> {
        return this.parent;
    }

    next(): ILinqIteratorResult<TSource> {
        var value: TSource;
        var done: boolean;

        if (!this.flattend) {
            this.items = this.baseParent().all();
            this.items.sort(this.sort);
        }

        done = !this.items.length;
        value = done ? null : this.items.shift();

        return new LinqIteratorResult(value, done);
    }

    sort(a: TSource, b: TSource): number {
        var akey: TKey = this.selc(a);
        var bkey: TKey = this.selc(b);
        return this.func(akey, bkey);
    }

    reset(): void {
        this.items.length = 0;
        this.flattend = false;
        super.reset();
    }
}

class RangeIterator extends IndexedIterator<number>
{
    private start: number;
    private count: number;

    constructor(start: number, count: number) {
        super();
        this.start = start;
        this.count = count;
    }

    next(): ILinqIteratorResult<number> {
        var done: boolean = this.index < this.count;
        var value: number = done ? null : this.start + this.index;
        this.index++;
        return new LinqIteratorResult<number>(value, done);
    }
}

class RepeatIterator<TSource> extends IndexedIterator<TSource>
{
    private value: TSource;
    private count: number;

    constructor(value: TSource, count: number) {
        super();
        this.value = value;
        this.count = count;
    }

    next(): ILinqIteratorResult<TSource> {
        var done: boolean = this.index < this.count;
        var value: TSource = done ? null : this.value;
        this.index++;
        return new LinqIteratorResult<TSource>(value, done);
    }
}

class ReverseIterator<TSource> extends ParentIterator<TSource, TSource>
{
    private items: TSource[];
    private flattend: boolean;

    constructor(parent: ILinqIterator<TSource>) {
        super(parent);
        this.items = [];
        this.flattend = false;
    }

    next(): ILinqIteratorResult<TSource> {
        var item: ILinqIteratorResult<TSource> = this.parent.next();
        var value: TSource;
        var done: boolean;

        if (!this.flattend) {
            this.items = this.all();
            this.flattend = true;
        }

        done = !this.items.length;
        value = done ? null : this.items.pop();

        return new LinqIteratorResult(value, done);
    }

    reset(): void {
        this.items.length = 0;
        this.flattend = false;
        super.reset();
    }
}

class SelectIterator<TSource, TResult> extends ParentIterator<TSource, TResult>
{
    private func: Selector<TSource, TResult>;

    constructor(parent: ILinqIterator<TSource>, func: Selector<TSource, TResult>) {
        super(parent);
        this.func = func;
    }

    next(): ILinqIteratorResult<TResult> {
        var item: ILinqIteratorResult<TSource> = this.parent.next();
        var result: TResult;

        if (!item.done) {
            result = this.func(item.value);
        }

        return new LinqIteratorResult<TResult>(result, item.done);
    }
}

class SelectManyIterator<TSource, TResult> extends ParentIterator<TSource, TResult>
{
    private func: Selector<TSource, TResult[]>;
    private items: TResult[];

    constructor(parent: ILinqIterator<TSource>, func: Selector<TSource, TResult[]>) {
        super(parent);
        this.func = func;
        this.items = [];
    }

    next(): ILinqIteratorResult<TResult> {
        if (!this.items.length) {
            var item: ILinqIteratorResult<TSource> = this.parent.next();

            if (!item.done) {
                this.items = this.func(item.value);
            }

            return new LinqIteratorResult<TResult>(item.done? null : this.items.shift(), item.done);
        } else {
            return new LinqIteratorResult<TResult>(this.items.shift(), false);
        }
    }

    reset(): void {
        this.items.length = 0;
        super.reset();
    }
}

class SkipIterator<TSource> extends ParentIterator<TSource, TSource>
{
    private count: number;
    private skipped: boolean;

    constructor(parent: ILinqIterator<TSource>, count: number) {
        super(parent);
        this.count = count;
        this.skipped = false;
    }

    next(): ILinqIteratorResult<TSource> {
        var index: number = 0;
        while (index < this.count) {
            index++;
            this.parent.next();
        }

        return this.parent.next();
    }

    reset(): void {
        this.skipped = false;
        super.reset();
    }
}

class SkipWhileIterator<TSource> extends ParentIterator<TSource, TSource>
{
    private func: Filter<TSource>;
    private skipped: boolean;

    constructor(parent: ILinqIterator<TSource>, func: Filter<TSource>) {
        super(parent);
        this.func = func;
        this.skipped = false;
    }

    next(): ILinqIteratorResult<TSource> {
        var item: ILinqIteratorResult<TSource> = this.parent.next();

        while (!this.skipped && !item.done) {
            this.skipped = this.func(item.value);

            if (this.skipped) {
                break;
            }

            item = this.parent.next();
        }

        return item;
    }

    reset(): void {
        this.skipped = false;
        super.reset();
    }
}

class TakeIterator<TSource> extends ParentIterator<TSource, TSource>
{
    private count: number;
    private index: number;

    constructor(parent: ILinqIterator<TSource>, count: number) {
        super(parent);
        this.count = count;
        this.index = 0;
    }

    next(): ILinqIteratorResult<TSource> {
        return this.index++ < this.count ? this.parent.next() : new LinqIteratorResult<TSource>(null, true);
    }

    reset(): void {
        this.index = 0;
        super.reset();
    }
}

class TakeWhileIterator<TSource> extends ParentIterator<TSource, TSource>
{
    private func: Filter<TSource>;
    private done: boolean;

    constructor(parent: ILinqIterator<TSource>, func: Filter<TSource>) {
        super(parent);
        this.func = func;
    }

    next(): ILinqIteratorResult<TSource> {
        var item: ILinqIteratorResult<TSource> = this.parent.next();
        this.done = this.done || this.func(item.value);
        return this.done ? new LinqIteratorResult<TSource>(null, true) : item;
    }

    reset(): void {
        this.done = false;
        super.reset();
    }
}

class ThenByIterator<TSource, TKey> extends OrderByIterator<TSource, TKey>
{
    private orderedParent: IOrderedIterator<TSource>;

    constructor(parent: IOrderedIterator<TSource>, sel: Selector<TSource, TKey>, func: Orderer<TKey>) {
        super(parent, sel, func);
        this.orderedParent = parent;
    }

    baseParent(): ILinqIterator<TSource> {
        return this.orderedParent.baseParent();
    }

    sort(a: TSource, b: TSource): number {
        var akey: TKey = this.selc(a);
        var bkey: TKey = this.selc(b);
        var result: number = this.orderedParent.sort(a, b);
        return result != 0 ? result : this.func(akey, bkey);
    }
}

class WhereIterator<TSource> extends ParentIterator<TSource, TSource>
{
    private func: Filter<TSource>;

    constructor(parent: ILinqIterator<TSource>, func: Filter<TSource>) {
        super(parent);
        this.func = func;
    }

    next(): ILinqIteratorResult<TSource> {
        var item: ILinqIteratorResult<TSource>;
        var match: boolean = false;

        while (!match && (item == null || !item.done)) {
            item = this.parent.next();
            match = this.func(item.value);
        }

        return item;
    }
}

class ZipIterator<TSource, TOther, TResult> extends DualParentIterator<TSource, TOther, TResult>
{
    private func: Combiner<TSource, TOther, TResult>;

    constructor(parent: ILinqIterator<TSource>, otherparent: ILinqIterator<TOther>, func: Combiner<TSource, TOther, TResult>) {
        super(parent, otherparent);
        this.func = func;
    }

    next(): ILinqIteratorResult<TResult> {
        var item: ILinqIteratorResult<TSource> = this.parent.next();
        var other: ILinqIteratorResult<TOther> = this.otherparent.next();
        var done = item.done || other.done;
        var result: TResult = done ? null : this.func(item.value, other.value);
        return new LinqIteratorResult<TResult>(result, done);
    }
}