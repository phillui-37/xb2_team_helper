import constant from "../ui/misc/constant"

export declare type Opt<T> = T | undefined
export declare type ValueOf<T> = T[keyof T]

export declare type TBlade = {
    readonly name: ValueOf<typeof constant.BLADE>
    readonly elements: ValueOf<typeof constant.ELEMENT>[]
    readonly weapon: ValueOf<typeof constant.WEAPON>

    // driver dependent
    readonly isBind: boolean
    readonly effects: ValueOf<typeof constant.EFFECT>[]
}

export declare type TMember = {
    readonly driver: ValueOf<typeof constant.DRIVER>
    readonly blades: [TBlade, Opt<TBlade>, Opt<TBlade>]
}
