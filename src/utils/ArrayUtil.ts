export type Comparator<A, B> = (a: A, b: B) => boolean;

export class ArrayUtil {
    public static reorderItem<T>(array: T[], from: number, to: number): T[] {
        const newArr = [...array];
        const temp = newArr[from];
        newArr.splice(from, 1);
        newArr.splice(to, 0, temp);

        return newArr;
    }

    public static insertItem<A>(array: A[], index: number, element: A): A[] {
        return [...array.slice(0, index), element, ...array.slice(index)];
    }

    public static addArrayItem<A>(item: A, array: A[], comparator: Comparator<A, A>): A[] {
        if (!array.find((e) => comparator(e, item))) {
            array.push(item);
        }
        return array;
    }

    public static removeArrayItem<A, B>(identifiable: A, array: B[], comparator: Comparator<B, A>): B[] {
        const idx = array.findIndex((e: B) => comparator(e, identifiable));
        if (idx >= 0) {
            array.splice(idx, 1);
        }
        return array;
    }

    public static findArrayItem<A, B>(identifiable: A, array: B[], comparator: Comparator<B, A>): B | null {
        return array.find((e: B) => comparator(e, identifiable)) ?? null;
    }

    public static removeItemsFromArray<A, B>(itemsToRemove: A[], array: B[], comparator: Comparator<B, A>): B[] {
        for (const item of itemsToRemove) {
            const idx = array.findIndex((e: B) => comparator(e, item));
            if (idx < 0) continue;
            array.splice(idx, 1);
        }
        return array;
    }

    public static findInclusiveElements<A>(arr1: A[], arr2: A[], comparator: (el1: A, el2: A) => boolean): A[] {
        return arr1.filter(item1 => arr2.some(item2 => comparator(item1, item2)));
    }

    public static findLeftExclusiveElements<A>(arr1: A[], arr2: A[], comparator: (el1: A, el2: A) => boolean): A[] {
        return arr1.filter(item1 => !arr2.some(item2 => comparator(item1, item2)));
    }

    public static getUniqueValues<A>(array: A[], comparator: Comparator<A, A>): A[] {
        return array.filter((item: A, index: number, self: A[]) => {
            return self.findIndex((t: A) => comparator(t, item)) === index;
        });
    }
}
