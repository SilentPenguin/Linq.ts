class Linq<TSource>
{
    protected iterator: ILinqIterator<TSource>;

    constructor(iterator: ILinqIterator<TSource>) {
        this.iterator = iterator;
    }

    ToIterator(): ILinqIterator<TSource> {
        return this.iterator;
    }

    private allSelector: Filter<TSource> = (item: TSource) => true;
    private notNullSelector: Filter<TSource> = (item: TSource) => item != null;
    private defaultComparer: Comparer<TSource> = (item: TSource, value: TSource) => item == value;

    Aggregate(func: Aggregator<TSource>): TSource {
        var result: TSource;
        var item: LinqIteratorResult<TSource> = this.iterator.next();

        while (!item.done) {
            result = func(result, item.value);
            item = this.iterator.next();
        }

        return result;
    }

    All(func?: Filter<TSource>): boolean {
        var result: boolean = true;
        var iterator: ILinqIterator<boolean> = new SelectIterator(this.iterator, func == null ? this.notNullSelector : func);
        var item: LinqIteratorResult<boolean> = iterator.next();

        while (!item.done && result) {
            result = item.value;
            item = iterator.next();
        }

        return result;
    }

    Any(func?: Filter<TSource>): boolean {
        var result: boolean = false;
        var iterator: ILinqIterator<boolean> = new SelectIterator(this.iterator, func == null ? this.notNullSelector : func);
        var item: LinqIteratorResult<boolean> = iterator.next();

        while (!item.done && !item.value) {
            result = item.value;
            item = iterator.next();
        }

        return result;
    }

    Average(func: Selector<TSource, number>): number {
        var result: number = 0;
        var count: number = 0;
        var iterator: ILinqIterator<number> = new SelectIterator(this.iterator, func);
        var item: LinqIteratorResult<number> = iterator.next();

        while (!item.done) {
            count++;
            result += item.value;
            item = iterator.next();
        }

        return result / count;
    }

    Cast<TResult extends TSource>(): Linq<TResult> {
        var iterator: ILinqIterator<TResult> = new SelectIterator(this.iterator, (item: TSource) => <TResult>item);
        return new Linq<TResult>(iterator);
    }

    Concat(other: Linq<TSource>): Linq<TSource> {
        var iterator: ILinqIterator<TSource> = new ConcatIterator<TSource>(this.iterator, other.iterator);
        return new Linq<TSource>(iterator);
    }

    Contains(match: TSource, func?: Comparer<TSource>): boolean {
        var result: boolean = false;
        var item: LinqIteratorResult<TSource> = this.iterator.next();

        if (func == null) {
            func = this.defaultComparer;
        }

        while (!item.done && !result) {
            result = func(item.value, match);
            item = this.iterator.next();
        }

        return result;
    }

    Count(func?: Filter<TSource>): number {
        var iterator = func == null ? this.iterator : new WhereIterator(this.iterator, func);
        var count: number = 0;
        var item: LinqIteratorResult<TSource> = iterator.next();

        while (!item.done) {
            count++;
            item = iterator.next();
        }

        return count;
    }

    //DefaultIfEmpty(): Linq<TSource> { }

    Distinct(func?: Comparer<TSource>): Linq<TSource> {
        if (func == null) {
            func = this.defaultComparer;
        }

        var iterator: ILinqIterator<TSource> = new DistinctIterator(this.iterator, func);
        return new Linq<TSource>(iterator);
    }

    ElementAt(index: number): TSource {
        var result: LinqIteratorResult<TSource> = this.iterator.next();
        var count: number = 0;

        while (!result.done && count < index) {
            count++;
            result = this.iterator.next();
        }

        if (result.done) {
            throw RangeError();
        } else {
            return result.value;
        }
    }

    ElementAtOrDefault(index: number): TSource {
        var result: LinqIteratorResult<TSource> = this.iterator.next();
        var count: number = 0;

        while (!result.done && count < index) {
            count++;
            result = this.iterator.next();
        }

        return result.done ? null : result.value;
    }

    Except(other: Linq<TSource>, func?: Comparer<TSource>) {
        if (func == null) {
            func = this.defaultComparer;
        }

        var iterator = new ExceptIterator(this.iterator, other.iterator, func);
        return new Linq<TSource>(iterator);
    }

    First(func?: Filter<TSource>): TSource {
        var iterator: ILinqIterator<TSource> = func != null ? new WhereIterator(this.iterator, func) : this.iterator;
        var result: ILinqIteratorResult<TSource> = iterator.next();
        if (result.done) {
            throw RangeError();
        } else {
            return result.value;
        }
    }

    FirstOrDefault(func: Filter<TSource>): TSource {
        var iterator: ILinqIterator<TSource> = func != null ? new WhereIterator(this.iterator, func) : this.iterator;
        var result: ILinqIteratorResult<TSource> = iterator.next();
        return result.done ? null : result.value;
    }

    GroupBy<TKey>(key: Selector<TSource, TKey>, func?: Comparer<TKey>): Linq<Group<TKey, TSource>>;
    GroupBy<TKey, TElement>(key: Selector<TSource, TKey>, element: Selector<TSource, TElement>, func?: Comparer<TKey>): Linq<Group<TKey, TElement>>;
    GroupBy<TKey, TResult>(key: Selector<TSource, TKey>, result: Combiner<TKey, Linq<TSource>, TResult>, func?: Comparer<TKey>): Linq<TResult>;
    GroupBy<TKey, TElement, TResult>(key: Selector<TSource, TKey>, element: Selector<TSource, TElement>, result: Combiner<TKey, Linq<TSource>, TResult>, func?: Comparer<TKey>): Linq<TResult>;
    GroupBy<TKey, TElement, TResult>(key: Selector<TSource, TKey>, element?: Selector<TSource, any>, result?: Combiner<TKey, Linq<any>, any>, func?: Comparer<TKey>): Linq<any> {
        if (element == null) {
            element = (item: TSource) => item;
        }

        if (result == null) {
            result = (key: TKey, group: Group<TKey, TElement>) => group;
        }

        if (func == null) {
            func = (outer: TKey, inner: TKey) => outer == inner;
        }

        var iterator: ILinqIterator<any> = new GroupByIterator(this.iterator, key, element, result, func);
        return new Linq<any>(iterator);
    }

    GroupJoin<TOther, TKey, TResult>(other: Linq<TOther>, outer: Selector<TSource, TKey>, inner: Selector<TOther, TKey>, selc: Combiner<TSource, Linq<TOther>, TResult>, func?: Comparer<TKey>): Linq<TResult> {
        if (func == null) {
            func = (outer: TKey, inner: TKey) => outer == inner;
        }

        var iterator: ILinqIterator<TResult> = new GroupJoinIterator(this.iterator, other.iterator, outer, inner, selc, func);
        return new Linq<TResult>(iterator);
    }

    Intersect(other: Linq<TSource>, func?: Comparer<TSource>): Linq<TSource> {
        if (func == null) {
            func = this.defaultComparer;
        }

        var iterator: ILinqIterator<TSource> = new IntersectIterator(this.iterator, other.iterator, func);
        return new Linq<TSource>(iterator);
    }

    Join<TOther, TKey, TResult>(other: Linq<TOther>, outer: Selector<TSource, TKey>, inner: Selector<TOther, TKey>, selc: Combiner<TSource, TOther, TResult>, func?: Comparer<TKey>): Linq<TResult> {
        if (func == null) {
            func = (outer: TKey, inner: TKey) => outer == inner;
        }
        
        var iterator: ILinqIterator<TResult> = new JoinIterator(this.iterator, other.iterator, outer, inner, selc, func);
        return new Linq<TResult>(iterator);
    }

    Last(func?: Filter<TSource>): TSource {
        var baseIterator: ILinqIterator<TSource> = func == null ? this.iterator : new WhereIterator(this.iterator, func)
        var iterator: ILinqIterator<TSource> = new ReverseIterator(baseIterator);
        var result: ILinqIteratorResult<TSource> = iterator.next();

        if (result.done) {
            throw RangeError();
        } else {
            return result.value;
        }
    }

    LastOrDefault(func: Filter<TSource>): TSource {
        var baseIterator: ILinqIterator<TSource> = func == null ? this.iterator : new WhereIterator(this.iterator, func)
        var iterator: ILinqIterator<TSource> = new ReverseIterator(baseIterator);
        var result: ILinqIteratorResult<TSource> = iterator.next();
        return result.done ? null : result.value;
    }

    Max(func: Selector<TSource, number>): TSource {
        return this.OrderBy(func).Last();
    }

    Min(func: Selector<TSource, number>): TSource {
        return this.OrderBy(func).First();
    }

    OrderBy<TKey>(selc: Selector<TSource, TKey>, func?: Orderer<TKey>): Linq<TSource> {
        var iterator: ILinqIterator<TSource> = new OrderByIterator<TSource, TKey>(this.iterator, selc, func);
        return new Linq<TSource>(iterator);
    }

    OrderByDecending<TKey>(selc: Selector<TSource, TKey>, func?: Orderer<TKey>): Linq<TSource> {
        return this.OrderBy(selc,(a: TKey, b: TKey) => -1 * func(a, b));
    }

    Range(start: number, count: number): Linq<number> {
        var iterator: ILinqIterator<number> = new RangeIterator(start, count);
        return new Linq<number>(iterator);
    }

    Repeat(element: TSource, count: number): Linq<TSource> {
        var iterator: ILinqIterator<TSource> = new RepeatIterator<TSource>(element, count);
        return new Linq<TSource>(iterator);
    }

    Reverse(): Linq<TSource> {
        var iterator: ILinqIterator<TSource> = new ReverseIterator<TSource>(this.iterator);
        return new Linq<TSource>(iterator);
    }

    Select<TResult>(func: Selector<TSource, TResult>): Linq<TResult> {
        var iterator: ILinqIterator<TResult> = new SelectIterator<TSource, TResult>(this.iterator, func);
        return new Linq<TResult>(iterator);
    }

    SelectMany<TResult>(func: Selector<TSource, TResult[]>): Linq<TResult> {
        var iterator: ILinqIterator<TResult> = new SelectManyIterator<TSource, TResult>(this.iterator, func);
        return new Linq<TResult>(iterator);
    }

    SequenceEqual(other: Linq<TSource>, func?: Comparer<TSource>): boolean {
        var result: boolean = true;
        var item: ILinqIteratorResult<TSource> = this.iterator.next();
        var otherItem: ILinqIteratorResult<TSource> = other.iterator.next();

        if (func == null) {
            func = this.defaultComparer;
        }

        while (result && !item.done && !otherItem.done) {
            result = func(item.value, otherItem.value);
            item = this.iterator.next();
            otherItem = other.iterator.next();
        }

        return result && item.done && otherItem.done;
    }

    Single(func: Filter<TSource>): TSource {
        var iterator: ILinqIterator<TSource> = func != null ? new WhereIterator(this.iterator, func) : this.iterator;
        var result: ILinqIteratorResult<TSource> = iterator.next();
        var next: ILinqIteratorResult<TSource> = iterator.next();
        if (result.done || !next.done) {
            throw RangeError();
        } else {
            return result.value;
        }
    }

    SingleOrDefault(func: Filter<TSource>): TSource {
        var iterator: ILinqIterator<TSource> = func != null ? new WhereIterator(this.iterator, func) : this.iterator;
        var result: ILinqIteratorResult<TSource> = iterator.next();
        var next: ILinqIteratorResult<TSource> = iterator.next();
        return result.done || !next.done ? null : result.value;
    }

    Skip(index: number): Linq<TSource> {
        var iterator: ILinqIterator<TSource> = new SkipIterator<TSource>(this.iterator, index);
        return new Linq<TSource>(iterator);
    }

    SkipWhile(func: Filter<TSource>): Linq<TSource> {
        var iterator: ILinqIterator<TSource> = new SkipWhileIterator<TSource>(this.iterator, func);
        return new Linq<TSource>(iterator);
    }

    Sum(func: Selector<TSource, number>): number {
        var result: number;
        var item: LinqIteratorResult<TSource> = this.iterator.next();

        while (!item.done) {
            result += func(item.value);
            item = this.iterator.next();
        }

        return result;
    }

    Take(index: number): Linq<TSource> {
        var iterator: ILinqIterator<TSource> = new TakeIterator<TSource>(this.iterator, index);
        return new Linq<TSource>(iterator);
    }

    TakeWhile(func: Filter<TSource>): Linq<TSource> {
        var iterator: ILinqIterator<TSource> = new TakeWhileIterator<TSource>(this.iterator, func);
        return new Linq<TSource>(iterator);
    }

    ThenBy<TKey>(selc: Selector<TSource, TKey>, func?: Orderer<TKey>): Linq<TSource> {
        var iterator: IOrderedIterator<TSource> = <IOrderedIterator<TSource>>this.iterator;
        if (iterator.sort != null) {
            iterator = new ThenByIterator(iterator, selc, func);
            return new Linq<TSource>(iterator);
        } else {
            throw TypeError();
        }
    }

    ThenByDecending<TKey>(selc: Selector<TSource, TKey>, func?: Orderer<TKey>): Linq<TSource> {
        return this.ThenBy(selc,(a: TKey, b: TKey) => -1 * func(a, b));
    }

    ToArray(): TSource[] {
        return this.iterator.all();
    }

    ToObject(property: Selector<TSource, string>, element?: Selector<TSource, any>): Object {
        var result: Object = {};
        var item: ILinqIteratorResult<TSource> = this.iterator.next();
        var key: string;
        var value: any;

        if (element == null) {
            element = (item: TSource) => item;
        }

        while (!item.done) {
            key = property(item.value);
            value = element(item.value);

            result[key] = value;

            item = this.iterator.next();
        }

        return result;
    }

    Union(other: Linq<TSource>): Linq<TSource> {
        return this.Concat(other).Distinct();
    }

    Where(func: Filter<TSource>): Linq<TSource> {
        var iterator: ILinqIterator<TSource> = new WhereIterator<TSource>(this.iterator, func);
        return new Linq<TSource>(iterator);
    }

    Zip<TOther, TResult>(other: Linq<TOther>, func: Combiner<TSource, TOther, TResult>): Linq<TResult> {
        var iterator: ILinqIterator<TResult> = new ZipIterator<TSource, TOther, TResult>(this.iterator, other.iterator, func);
        return new Linq<TResult>(iterator);
    }
}

class Group<TKey, TSource> extends Linq<TSource>
{
    public key: TKey;

    constructor(key: TKey, iterator: ILinqIterator<TSource>) {
        super(iterator);
        this.key = key;
    }
}
