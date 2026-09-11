import { MenuItem, Select } from "@mui/material"
import type { Opt, TBlade, TMember, ValueOf } from "../../types/common"
import constant from "../misc/constant"
import DB from "../../model/db"

export declare type MemberBoxProps = {
    readonly onChange: (member: TMember) => void
    readonly state: Opt<TMember>
    readonly possibleDriverList: ValueOf<typeof constant.DRIVER>[]
    readonly possibleBladeList: ValueOf<typeof constant.BLADE>[]
}

declare type DriverSelectProp = {
    readonly onChange: (driver: TMember['driver']) => void
    readonly state: Opt<TMember['driver']>
    readonly options: MemberBoxProps['possibleDriverList']
}

declare type BladeSelectProp = {
    readonly onChange: (blade: Opt<TBlade>) => void
    readonly state: Opt<TBlade>
    readonly options: MemberBoxProps['possibleBladeList']
}

const db = DB.getInstance()

const getBladeAttrMeta = (driver: ValueOf<typeof constant.DRIVER>) => async (blade: Opt<ValueOf<typeof constant.BLADE>>) => {
    if (!blade) return blade
    const entry = await db.getBladeAttrByDriverAndBlade(blade, driver)
    if (!entry) return entry
    return {
        ...entry,
        isBind: true
    } as TBlade
}

const DriverSelect = (props: DriverSelectProp) => {
    return <Select
        value={props.state}
        onChange={event => props.onChange(event.target.value)}>
        {props.options.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
    </Select>
}

const BladeSelect = (props: BladeSelectProp) => {
    // need to have clear button for non fixed blade
    // if fixed blade, readonly, maybe just a readonly input box is ok
    if (props.state?.isBind === true) {
        // fixed blade
    } else {
        // non fixed blade
    }
}

export default function MemberBox(props: MemberBoxProps) {
    // driver
    // 1st blade, must be fixed
    // 2nd and 3rd, maybe fixed
    return <div className="flex items-center flex-col">
        <DriverSelect
            onChange={async driver => {
                // get fixed blades and reset all
                const results = await db.getFixedBladeByDriver(driver)
                if (!results)
                    throw new Error(`${driver} cannot get fixed blade list!`)
                const [blade1, blade2, blade3] = results[0]?.blades!
                const getBladeAttr = getBladeAttrMeta(driver)
                const blades: [TBlade, Opt<TBlade>, Opt<TBlade>] = [
                    (await getBladeAttr(blade1))!,
                    await getBladeAttr(blade2),
                    await getBladeAttr(blade3)
                ]
                props.onChange({ driver, blades })
            }}
            state={props.state?.driver}
            options={props.possibleDriverList}
        />
    </div>
}