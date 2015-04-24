interface Selector<TSource, TResult> {
    (item: TSource): TResult;
}

interface Combiner<TSource, TOther, TResult> {

    (outer: TSource, inner: TOther): TResult; 
}

interface Filter<T> extends Selector<T, boolean> {}

interface Joiner<TSource, TResult> extends Combiner<TSource, TSource, TResult> { }

interface Aggregator<T> extends Joiner<T, T> { }

interface Comparer<T> extends Joiner<T, boolean> { }

interface Orderer<T> extends Joiner<T, number> { }